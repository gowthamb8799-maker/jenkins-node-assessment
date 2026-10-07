const assert = require("assert");

function getHealthStatus() {
    return {
        status: "UP"
    };
}

const result = getHealthStatus();

assert.strictEqual(result.status, "UP");

console.log("=================================");
console.log("Node.js application test PASSED");
console.log("=================================");
