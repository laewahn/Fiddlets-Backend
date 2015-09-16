/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

describe("The variable trace", function() {
	var VariableTrace = require("../VariableTrace.js");
	var fs = require("fs");
	
	var testTrace = new VariableTrace(fs.readFileSync("./spec/variableTraceExampleCode.js"));
	testTrace.runCode();

	it("should find all variable assignments in the code", function() {
		expect(testTrace.getAssignments()).toEqual(["string", "regExpMetaCharacters", "replacement", "anArray"]);
	});

	it("should create a tracing reference for every variable in the code", function(){
		expect(testTrace.trace.replacement).toEqual("\\$&");
		expect(testTrace.trace.regExpMetaCharacters).toEqual(/\S/g);
	});

	it("should update a reference if the variable was updated to point somewhere else", function() {
		expect(testTrace.trace.string).toEqual("foo bar");
		expect(testTrace.trace.anArray).toEqual(["hello"]);
	});

	it("should not leak the trace into the VariableTrace scope", function() {
		expect(testTrace.__trace).not.toBeDefined();
	});
});