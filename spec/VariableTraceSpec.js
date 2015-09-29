/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

describe("The variable trace", function() {
	var VariableTrace = require("../VariableTrace.js");
	var fs = require("fs");
	
	var testTrace = new VariableTrace(fs.readFileSync("./spec/variableTraceExampleCode.js"));
	testTrace.runCode();

	it("should find all variable assignments in the code", function() {
		expect(testTrace.getAssignments()).toEqual(["string", "regExpMetaCharacters", "replacement", "anArray", "sayHello"]);
	});

	it("should create a tracing reference for every variable in the code", function(){
		expect(testTrace.trace.replacement).toEqual("\\$&");
		expect(testTrace.trace.regExpMetaCharacters).toEqual(/\S/g);
	});

	it("should update a reference if the variable was updated to point somewhere else", function() {
		expect(testTrace.trace.string).toEqual("foo bar");
		expect(testTrace.trace.anArray).toEqual(["hello"]);
	});

	it("should create tracing references for functions", function() {
		expect(testTrace.trace.sayHello).toBeDefined();
		expect(testTrace.trace.sayHello instanceof Function).toBe(true);
	});

	it("should not leak the trace into the VariableTrace scope", function() {
		expect(testTrace.__trace).not.toBeDefined();
	});

	it("should append the tracing code right after the line that declares/updates the variable that should be traced", function(){
		testTrace = new VariableTrace("var foo;\nvar bar;\nfoo = bar;\n");
		testTrace.runCode();

		expect(testTrace.instrumentedSource).toEqual("var foo;\n" +
													 "__trace.foo = foo;\n" +
													 "var bar;\n" +
													 "__trace.bar = bar;\n" +
													 "foo = bar;\n" +
													 "__trace.foo = foo;");
	});

	it("should be able to trace self-assignments", function() {
		testTrace = new VariableTrace("var tagsToCompile = \"<% %>\";\nvar spaceRe = /\\s+/;\ntagsToCompile = tagsToCompile.split(spaceRe, 2);");
		testTrace.runCode();

		expect(testTrace.trace.tagsToCompile).toEqual(["<%", "%>"]);
	});
});