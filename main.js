const simple = require("./simple/Simple");

let tree = simple.parse("./tests/factorial.simple");
const exitCode = simple.execute(tree) || 0;
console.log("Program exited with code", exitCode);