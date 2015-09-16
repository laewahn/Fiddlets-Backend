/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

describe("The variable trace", function() {
	var VariableTrace = require("../VariableTrace.js");
	var fs = require("fs");
	var source = fs.readFileSync("./spec/variableTraceExampleCode.js");
	var testTrace = new VariableTrace(source);

	it("should find all variable assignments in the code", function() {
		testTrace.instrumentCode();
		testTrace.runCode();
		
		expect(testTrace.getAssignments()).toEqual(["string", "regExpMetaCharacters", "replacement"]);
		expect(testTrace.__trace).not.toBeDefined();
	});

	it("should create a tracing reference for every variable in the code", function(){
		testTrace.instrumentCode();
		testTrace.runCode();

		var tracedVariables = Object.keys(testTrace.trace);
		expect(tracedVariables).toEqual(["string", "regExpMetaCharacters", "replacement"]);
	});

	it("should update a reference if the variable was updated to point somewhere else", function() {

	});
});