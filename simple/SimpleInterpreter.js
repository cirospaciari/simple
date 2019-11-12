class SimpleInterpreter {

    constructor(){
        this.execute = this.execute.bind(this);
    }
    parseString(value) {
        value = value.trim();
        //its a formated string
        if (value[0] === "'" && value[value.length - 1] === "'") {
            return value.substring(1, value.length - 1)
                .split("\\n").join("\n")
                .split("\\t").join("\t")
                .split("\\r").join("\r")
                .split("\\b").join("\b")
                .split("\\f").join("\f")
                .split("\\\\").join("\\")
                .split("\\'").join("'");

        }
        return value;
    }
    convertToType(type, value) {
        switch (type) {
            case "any":
                var convetedValue = parseFloat(value);
                //if its not a valid number its a string
                if (isNaN(convetedValue)) {
                    return this.parseString(value);
                } else {
                    return convetedValue;
                }
            case "int":
                return value ? parseInt(value, 10) : 0;
            case "float":
                return value ? parseFloat(value) : 0.0;
            case "string":
            default:
                return this.parseString(value);
        }
    }
    variableOrLiteral(context, value, type) {
        var prop = this.getProperty(context, value);
        return typeof prop === "undefined" ? this.convertToType(type || "any", value) : prop;
    }
    compare(context, left, operator, right) {
        left = this.variableOrLiteral(context, left);
        right = this.variableOrLiteral(context, right);

        switch (operator) {
            case "eq":
            case "equals":
                return left === right;
            case "lt":
            case "lesser":
                return left < right;
            case "gt":
            case "greater":
                return left > right;
            case "lte":
                return left <= right;
            case "gte":
                return left >= right;
            case "neq":
            case "not":
                return left !== right;
            default:
                throw "Syntax Error invalid operator " + operator;
        }
    }
    clone(obj) {
        var clone = {};
        for (var i in obj) {
            clone[i] = obj[i];
        }
        return clone;
    }

    getProperty(context, name) {
        var parts = name.split('.');
        var obj = context;
        do {
            var prop = parts.shift();
            if (typeof obj !== "undefined") {
                obj = obj[prop];
            }
        } while (parts.length);

        return obj;
    }
    setProperty(context, name, value) {
        var parts = name.split('.');
        var obj = context;
        var names = [];
        do {
            var prop = parts.shift();
            if (typeof obj === "undefined") {
                throw names.join(".") + " its not defined";
            }
            if (parts.length) {
                obj = obj[prop];
                names.push(prop);
            } else {
                obj[prop] = value;
            }
        } while (parts.length);
    }

    execute(commands, context, bindContext) {
        context = context || {};
        let count = commands.length;
        for (var i = 0; i < count; i++) {
            var command = commands[i];
            switch (command.command) {
                case "import":
                    var path = require("path");
                    var filename = path.join(path.dirname(command.filename), command.data);
                    var tree = require("./SimpleParser").SimpleParser.parse(filename);
                    tree = tree.filter((c)=> c.command !== "ret");
                    tree.forEach((c, index)=> commands.splice(i+index+1, 0, c));
                    count = commands.length;
                    break;
                case "while":

                    while (this.compare(context, command.left, command.operator, command.right)) {
                        var ret = this.execute(command.block.commands, context);
                        if (context["___exit_cause"] === "ret") {
                            return ret;
                        } else if (context["___exit_cause"] === "continue") {
                            context["___exit_cause"] = undefined;
                            continue;
                        } else if (context["___exit_cause"] === "break") {
                            context["___exit_cause"] = undefined;
                            break;
                        }
                    }
                    break;
                case "continue":
                    context["___exit_cause"] = "continue";
                    return;
                case "break":
                    context["___exit_cause"] = "break";
                    return;
                case "if":
                    if (this.compare(context, command.left, command.operator, command.right)) {
                        var ret = this.execute(command.block.commands, context);
                        if (context["___exit_cause"] === "ret") {
                            return ret;
                        } else if (typeof context["___exit_cause"] !== "undefined") {

                            throw "Syntax Error " + context["___exit_cause"];
                        }
                    }

                    break;
                case "var":
                    this.setProperty(context, command.name, this.variableOrLiteral(context, command.value, command.type || "any"));
                    break;
                case "class":
                    //declare class in context
                    this.setProperty(context, command.name, command);
                    break;
                case "fun":
                    if (bindContext) {
                        command = this.clone(command);
                        command.binded = context;
                    }
                    //declare fun in context
                    this.setProperty(context, command.name, command);
                    break;
                case "array":
                    this.setProperty(context, command.name, command.parameters.map((p) => this.variableOrLiteral(context, p)));
                    break;
                case "get":
                    var array = this.getProperty(context, command.name);

                    if (!(array instanceof Array)) {
                        throw new SyntaxError(command.name + " is not a array.\nin line " + command.line + " of file " + command.filename);
                    }
                    var index = parseInt(this.variableOrLiteral(context, command.parameters[0] || ""));
                    if (isNaN(index)) {

                        throw new SyntaxError(command.name + " do not have '" + (command.parameters[0] || "") + "' index.\nin line " + command.line + " of file " + command.filename);
                    }
                    if (command.return) {
                        this.setProperty(context, command.return, array[index]);
                    }
                    break;
                case "length":
                    var array = this.getProperty(context, command.name);

                    if (!(array instanceof Array)) {
                        throw new SyntaxError(command.name + " is not a array.\nin line " + command.line + " of file " + command.filename);
                    }

                    if (command.return) {
                        this.setProperty(context, command.return, array.length);
                    }
                    break;
                case "push":
                    var array = this.getProperty(context, command.name);
                    if (!(array instanceof Array)) {
                        throw new SyntaxError(command.name + " is not a array.\nin line " + command.line + " of file " + command.filename);
                    }
                    command.parameters.map(p => this.variableOrLiteral(context, p)).forEach((v) => {
                        array.push(v);
                    });

                    if (command.return) {
                        this.setProperty(context, command.return, array.length);
                    }
                    break;
                case "pop":
                    var array = this.getProperty(context, command.name);

                    if (!(array instanceof Array)) {
                        throw new SyntaxError(command.name + " is not a array.\nin line " + command.line + " of file " + command.filename);
                    }
                    if (command.return) {
                        this.setProperty(context, command.return, array.pop());
                    }
                    break;

                case "call":
                    var fun = this.getProperty(context, command.name);

                    if (!fun || fun.command !== "fun") {
                        throw new SyntaxError(command.name + " is not a function.\nin line " + command.line + " of file " + command.filename);

                    }
                    {

                        var funContext = fun.binded || this.clone(context); //pass parent context

                        fun.parameters.forEach((p, index) => {
                            funContext[p] = this.variableOrLiteral(context, command.parameters[index]);
                        });
                        if (command.return) {
                            this.setProperty(context, command.return, this.execute(fun.block.commands, funContext));
                        } else {
                            this.execute(fun.block.commands, funContext);
                        }
                    }
                    break;
                case "obj":
                    //pass parent context
                    var objContext = this.clone(context);
                    this.execute(command.block.commands, objContext, true);
                    //clean parent context
                    Object.keys(context).forEach((v)=> delete objContext[v]);
                    this.setProperty(context, command.name, objContext);
                    break;
                case "new":
                    var fun = this.getProperty(context, command.name);

                    if (!fun || fun.command !== "class") {
                        throw new SyntaxError(command.name + " is not a class.\nin line " + command.line + " of file " + command.filename);
                    }
                    {

                        var classContext = {};//this.clone(context);
                        this.execute(fun.block.commands, classContext, true);

                        if (classContext["new"] && classContext["new"].command === "fun") {
                            classContext["new"].parameters.forEach((p, index) => {
                                classContext[p] = this.variableOrLiteral(context, command.parameters[index]);
                            });
                            this.execute(classContext["new"].block.commands, classContext);
                            classContext["new"].parameters.forEach((p) => {
                                delete classContext[p];
                            });
                            delete classContext["new"];
                        }
                        if (command.return) {
                            this.setProperty(context, command.return, classContext);
                        }
                    }
                    break;
                case "ret":
                    context["___exit_cause"] = "ret";
                    return this.variableOrLiteral(context, command.data)
                case "set":
                    var value = this.getProperty(context, command.a);
                    if (typeof value === "undefined") {
                        throw new SyntaxError(command.a + " is not defined.\nin line " + command.line + " of file " + command.filename);
                    }
                    this.setProperty(context, command.a, this.variableOrLiteral(context, command.b));
                    break;
                case "add":
                    var value = this.getProperty(context, command.a);
                    if (typeof value === "undefined") {
                        throw new SyntaxError(command.a + " is not defined.\nin line " + command.line + " of file " + command.filename);
                    }
                    this.setProperty(context, command.a, value + this.variableOrLiteral(context, command.b));
                    break;
                case "mul":
                    var value = this.getProperty(context, command.a);
                    if (typeof value === "undefined") {
                        throw new SyntaxError(command.a + " is not defined.\nin line " + command.line + " of file " + command.filename);
                    }
                    this.setProperty(context, command.a, value * this.variableOrLiteral(context, command.b));
                    break;
                case "div":
                    var value = this.getProperty(context, command.a);
                    if (typeof value === "undefined") {
                        throw new SyntaxError(command.a + " is not defined.\nin line " + command.line + " of file " + command.filename);
                    }
                    this.setProperty(context, command.a, value / this.variableOrLiteral(context, command.b));
                    break;
                case "sub":
                    var value = this.getProperty(context, command.a);
                    if (typeof value === "undefined") {
                        throw new SyntaxError(command.a + " is not defined.\nin line " + command.line + " of file " + command.filename);
                    }
                    this.setProperty(context, command.a, value - this.variableOrLiteral(context, command.b));
                    break;
                case "mod":
                    var value = this.getProperty(context, command.a);
                    if (typeof value === "undefined") {
                        throw new SyntaxError(command.a + " is not defined.\nin line " + command.line + " of file " + command.filename);
                    }
                    this.setProperty(context, command.a, value % this.variableOrLiteral(context, command.b));
                    break;
                case "puts":
                    console.log(this.variableOrLiteral(context, command.data));
                    break;
                case "format":
                    if (typeof this.getProperty(context, command.a) === "undefined") {
                        throw new SyntaxError(command.a + " is not defined.\nin line " + command.line + " of file " + command.filename);
                    }
                    command.parameters
                        .map((p) => this.variableOrLiteral(context, p)
                        ).forEach((v, i) => {
                            this.setProperty(context, command.a, this.getProperty(context, command.a).split("#{" + i + "}").join(v));
                        });
                    break;
                case "concat":
                    if (typeof this.getProperty(context, command.a) === "undefined") {
                         throw new SyntaxError(command.a + " is not defined.\nin line " + command.line + " of file " + command.filename);
                    }
                    setProperty(context, command.a, this.getProperty(context, command.a) + command.parameters
                        .map((p) => this.variableOrLiteral(context, p)
                        ).join(""));
                    break;
                default:
                    throw new SyntaxError("Invalid command type " + command.command + ".\nin line " + command.line + " of file " + command.filename);
            }
        }
        context["___exit_cause"] = "end";
    }
}


exports.SimpleInterpreter = new SimpleInterpreter();