/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

var fs = require("fs");
var testSource = fs.readFileSync("spec/testSource.js", "utf8");

describe("The test spec", function() {
	it("should have the source", function() {
		expect(testSource).toBeDefined();
	});
});

describe("The context collector API", function() {
	var contextCollectAPI = require("../ContextCollector.js");

	it("should be accessible through require", function() {	
		expect(contextCollectAPI).toBeDefined();
	});

	it("should be able to parse the code and return the context", function() {
		var testContext = contextCollectAPI.getContextFor(testSource);
		expect(testContext).toBeDefined();
	});
});

describe("The context", function() {
	
});