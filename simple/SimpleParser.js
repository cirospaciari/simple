

class SimpleParser {


    constructor(code, filename){
        this.code = code;
        this.filename = filename;
    }

    parseCommand(type, command, line) {
        switch (type) {
            case "var":
                return {
                    command: type,
                    name: (command.split(' ')[0].trim().split("#")[0] || "").trim(),
                    type: (command.split(' ')[0].trim().split("#")[1] || "").trim(),
                    value: command.substr(command.split(' ')[0].length).trim(),
                    line: line,
                    filename: this.filename
                }
            case "if":
            case "while":
                return {
                    command: type,
                    left: command.split(' ')[0].trim(),
                    operator: (command.split(' ')[1] || "").trim(),
                    right: (command.split(' ')[2] || "").trim(),
                    line: line,
                    filename: this.filename
                }
            case "array":
            case "class":
            case "obj":
            case "fun":
                return {
                    command: type,
                    name: command.split(' ')[0].trim(),
                    parameters: command.substr(command.split(' ')[0].length).trim().split(' ').map((p) => p.trim()).filter(p => p),
                    line: line,
                    filename: this.filename
                }
    
            case "get":
            case "length":
            case "pop":
            case "call":
            case "push":
            case "new":
    
                return {
                    command: type,
                    name: command.split(' ')[0].trim(),
                    parameters: command.substr(command.split(' ')[0].length).trim().split('->')[0].split(' ').map((p) => p.trim()).filter(p => p),
                    return: (command.split('->')[1] || "").trim(),
                    line: line,
                    filename: this.filename
                }
            case "format":
            case "concat":
                return {
                    command: type,
                    a: command.split(' ')[0].trim(),
                    parameters: command.substr(command.split(' ')[0].length).trim().split(' ').map((p) => p.trim()).filter(p => p),
                    line: line,
                    filename: this.filename
                }
            case "break":
            case "continue":
            case "end":
                return {
                    command: type,
                    line: line,
                    filename: this.filename
                }
            case "puts":
            case "ret":
            case "export":
            case "import":
                return {
                    command: type,
                    data: command,
                    line: line,
                    filename: this.filename
                }
    
            case "set":
            case "add":
            case "mul":
            case "div":
            case "sub":
            case "mod":
                return {
                    command: type,
                    a: command.split(' ')[0].trim(),
                    b: command.substr(command.split(' ')[0].length).trim(),
                    line: line,
                    filename: this.filename
                }
            default:
                throw new SyntaxError("Invalid command type '" + type + "'.\nin line "+ line + " of file " + this.filename);
        }
    
    }

    parseLine(line, index) {
        line = (line || "").trim();
    
        var commented = line.indexOf("//");
        if (commented > -1) {
            line = line.substr(0, commented).trim();
        }
        if (!line)
            return;
    
        var commandEnd = line.indexOf(':');
        var type = line.substr(0, commandEnd)
        return this.parseCommand(type, line.substr(commandEnd + 1).trim(), index + 1);
    }

    makeCodeBlock(bash, index) {
        var block = {
            start: index,
            commands: [],
            end: index
        };
        for (var i = index; i < bash.length; i++) {
            if (bash[i].command === "end") {
                block.end = i;
                return block;
            } else if (bash[i].command === "fun" ||
                bash[i].command === "if" ||
                bash[i].command === "while" ||
                bash[i].command === "class" ||
                bash[i].command === "obj") {
                var subFun = bash[i];
                block.commands.push(subFun);
                subFun.block = this.makeCodeBlock(bash, i + 1);
                i = subFun.block.end;
            } else {
                block.commands.push(bash[i]);
            }
        }
        return block;
    }
    
    
    parse(){
        var bash = this.code.split("\n").map((line, index) => this.parseLine(line, index)).filter(c => c);
        var tree = this.makeCodeBlock(bash, 0).commands;
        
        return tree;
    }

    static parse(filename){

        var code = require("fs").readFileSync(filename).toString();
        return new SimpleParser(code, filename).parse();
    }

}

exports.SimpleParser = SimpleParser;