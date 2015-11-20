/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

var fs = require("fs");
var testSource = fs.readFileSync("spec/source/testSource.js", "utf8");
var contextCollectAPI = require("../ContextCollector.js");

xdescribe("The test spec", function() {
	it("should have the source", function() {
		expect(testSource).toBeDefined();
	});
});


describe("Functional scoping", function() {
	
	testSource = fs.readFileSync("./spec/scopesAndUnknownsExample.js");
	var globalScope = contextCollectAPI.scopeMappingForCode(testSource);
	
	var fooScope = globalScope.getContainedScope(0);
	var barScope = fooScope.getContainedScope(0);
	var uppercaseScope = fooScope.getContainedScope(1);
	var anotherAnonymousScope = globalScope.getContainedScope(1);
	var anAnonymousScope = globalScope.getContainedScope(2);
	
	it("builds scopes from outside-in", function() {	
		
		expect(globalScope.getContainedScopes().length).toBe(3);
		expect(fooScope.getContainedScopes().length).toBe(2);

		expect(fooScope).toBeDefined();
		expect(barScope).toBeDefined();
		expect(uppercaseScope).toBeDefined();
		expect(anAnonymousScope).toBeDefined();
		expect(anotherAnonymousScope).toBeDefined();
	});

	it("stores ranges of scopes", function() {
		expect(globalScope.getRange()).toEqual({
			start: 2,
			end: 61
		});

		expect(fooScope.getRange()).toEqual({
			start: 4,
			end: 27
		});
		
		expect(barScope.getRange()).toEqual({
			start: 7,
			end: 13
		});

		expect(uppercaseScope.getRange()).toEqual({
			start: 20,
			end: 24
		});

		expect(anotherAnonymousScope.getRange()).toEqual({
			start: 38,
			end: 44
		});

		expect(anAnonymousScope.getRange()).toEqual({
			start: 33,
			end: 38
		});
	});
	
	it("stores the parent scope for every scope", function() {
		expect(globalScope.getParent()).toBeUndefined();
		expect(fooScope.getParent()).toBe(globalScope);
		expect(barScope.getParent()).toBe(fooScope);
		expect(anotherAnonymousScope.getParent()).toBe(globalScope);
		expect(anAnonymousScope.getParent()).toBe(globalScope);	
	});
	
	it("stores local identifiers of a scope", function() {
		expect(globalScope.getLocals()).toEqual(["globalVar", "foo", "multiLine"]);
		expect(fooScope.getLocals()).toEqual(["bar", "firstLevel", "firstLevelSecondLevel", "arr"]);
		expect(barScope.getLocals()).toEqual(["thirdLevel"]);
		expect(anAnonymousScope.getLocals()).toEqual(["anAnonymous", "secret"]);
		expect(anotherAnonymousScope.getLocals()).toEqual(["anotherAnonymous", "anonymousInner"]);

		
	});

	// Maybe include own function name in locals?

	it("stores declared functions of a scope", function() {
		expect(fooScope.getLocationsForIdentifier("bar").length).toEqual(2);

		expect(fooScope.getLocationsForIdentifier("bar")[0].start.line).toEqual(7);
		expect(fooScope.getLocationsForIdentifier("bar")[0].start.column).toEqual(1);
		expect(fooScope.getLocationsForIdentifier("bar")[0].end.line).toEqual(13);
		expect(fooScope.getLocationsForIdentifier("bar")[0].end.column).toEqual(2);
	});	

	it("keeps a list of unknown variables for a scope", function() {
		expect(barScope.getUnknownVariables()).toEqual(["baz", "firstLevelSecondLevel", "globalVar", "log"]);
		expect(anAnonymousScope.getUnknownVariables()).toEqual(["anonymous"]);
		expect(anotherAnonymousScope.getUnknownVariables()).toEqual(["text", "log", "globalVar"]);
	});

	it("keeps a list of identifiers used in that scope", function() {
		expect(barScope.getIdentifiers()).toEqual(["baz", "thirdLevel", "firstLevelSecondLevel", "globalVar", "log"]);
		expect(anotherAnonymousScope.getIdentifiers()).toEqual(["text", "anonymousInner", "log", "globalVar"]);
	});

	describe("ContextCollector", function() {
		testSource = fs.readFileSync("./spec/scopesAndUnknownsExample.js", "utf8");
		var ContextCollector = contextCollectAPI.ContextCollector;
		var collector = new ContextCollector(testSource);

		it("finds the scope for a line", function() {
			expect(collector.getScopeForLine(1)).toEqual(globalScope);
			expect(collector.getScopeForLine(2)).toEqual(globalScope);
			expect(collector.getScopeForLine(11)).toEqual(barScope);
			expect(collector.getScopeForLine(15)).toEqual(fooScope);
			expect(collector.getScopeForLine(34)).toEqual(anAnonymousScope);
			expect(collector.getScopeForLine(34)).toEqual(anAnonymousScope);
			expect(collector.getScopeForLine(44)).toEqual(anotherAnonymousScope);
		});

		it("finds identifiers by line", function(){
			expect(collector.getIdentifiersInLine(12)).toEqual(["baz", "thirdLevel", "globalVar", "log"]);
			expect(collector.getIdentifiersInLine(15)).toEqual(["firstLevel"]);
			expect(collector.getIdentifiersInLine(17)).toEqual(["bar", "firstLevel"]);
		});

	});

	describe("Context creation", function() {
		testSource = fs.readFileSync("./spec/scopesAndUnknownsExample.js", "utf8");
		var ContextCollector = contextCollectAPI.ContextCollector;
		var collector = new ContextCollector(testSource);

		it("creates a context for a given simple line", function() {
			expect(collector.contextForLine(15)).toEqual("");
			expect(collector.contextForLine(16)).toEqual("");
			expect(collector.contextForLine(46)).toEqual("var globalVar = 5;");
		});

		it("creates unknown tags for lines using unknown variables", function() {
			expect(collector.contextForLine(37)).toEqual("var anonymous = <#undefined:anonymous:37#>;\nvar secret = \"stuff\";");
		});

		// TODO: scopes for line and column.
		xit("can use references to functions that have more than one line", function() {
			var context = collector.contextForLine(17);

			var expectedContext = 
				"function bar(baz) {\n" +
				"// Locals: [thirdLevel]\n" +
				"// Unkown: [baz]\n" +
				"var thirdLevel = \"third\";\n" +
				"firstLevelSecondLevel = \"asdf\";\n" +
				"console.log(baz + \" \" + thirdLevel + \" \" + globalVar);\n" +
				"}\n" +
				"var firstLevel = \"Hello\";";

			expect(context).toEqual(expectedContext);
		});

		xit("can use references to stuff that has more than one line", function() {
			fail("TODO");
		});
	});
});

xdescribe("The line mapping", function() {
	
	it("should be accessible through require", function() {	
		expect(contextCollectAPI).toBeDefined();
	});

	it("should be able to parse the code and return the context", function() {
		var testContext = contextCollectAPI.getIdentifierMapping(testSource);
		expect(testContext).toBeDefined();
	});

	describe("The context", function() {
		
		var testContext = contextCollectAPI.getIdentifierMapping(testSource);

		it("should return where a variable was declared", function() {
			expect(testContext.locationsFor("index")[0].start.line).toEqual(5);
			expect(testContext.locationsFor("secondInSameLine")[0].start.line).toEqual(1);
			expect(testContext.locationsFor("y")[0].start.line).toEqual(1);
		});

		it("should return where a variable was set", function() {
			expect(testContext.locationsFor("y").some(function(line) {
				return line.start.line === 1;
			})).toBe(true);

			expect(testContext.locationsFor("secondInSameLine").some(function(line) {
				return line.start.line === 2;
			})).toBe(true);
		});

		it("should return where a variable was assigned to a different variable", function() {
			// var index = y;
			expect(testContext.locationsFor("index").some(function(line) {
				return line.start.line === 5;
			})).toBe(true);

			expect(testContext.locationsFor("y").some(function(line) {
				return line.start.line === 5;
			})).toBe(true);

			// howMany = secondInSameLine
			expect(testContext.locationsFor("howMany").some(function(line) {
				return line.start.line === 24;
			})).toBe(true);

			expect(testContext.locationsFor("secondInSameLine").some(function(line) {
				return line.start.line === 24;
			})).toBe(true);			
		});

		it("should return where an object was accessed", function() {
			expect(testContext.locationsFor("anArray").some(function(line) {
				return line.start.line === 7;
			})).toBe(true);
		
			expect(testContext.locationsFor("anArray").some(function(line) {
				return line.start.line === 8;
			})).toBe(true);

			expect(testContext.locationsFor("anArray").some(function(line) {
				return line.start.line === 10;
			})).toBe(true);
		});

		it("should return where a variable was used in an operator", function() {
			// Binary operator
			expect(testContext.locationsFor("y").some(function(line) {
				return line.start.line === 3;
			})).toBe(true);

			expect(testContext.locationsFor("secondInSameLine").some(function(line) {
				return line.start.line === 3;
			})).toBe(true);

			// Ternary operator
			expect(testContext.locationsFor("index").some(function(line) {
				return line.start.line === 25;
			})).toBe(true);

			expect(testContext.locationsFor("bla").some(function(line) {
				return line.start.line === 25;
			})).toBe(true);

			expect(testContext.locationsFor("y").some(function(line) {
				return line.start.line === 25;
			})).toBe(true);
		});

		it("should return where an operation was used on a variable with a shortcut", function() {
			expect(testContext.locationsFor("count").some(function(line) {
				return line.start.line === 35;
			})).toBe(true);

			expect(testContext.locationsFor("count").some(function(line) {
				return line.start.line === 40;
			})).toBe(true);
		});

		it("should return where a variable was used as a parameter", function(){
			expect(testContext.locationsFor("index").some(function(line) {
				return line.start.line === 10;
			})).toBe(true);

			expect(testContext.locationsFor("bla").some(function(line) {
				return line.start.line === 12;
			})).toBe(true);

			expect(testContext.locationsFor("appendBla").some(function(line) {
				return line.start.line === 11;
			})).toBe(true);
		});

		it("should return where a function was declared", function() {
			expect(testContext.locationsFor("prependFoo").some(function(line) {
				return line.start.line === 20 && line.end.line === 22;
			})).toBe(true);
		});

		it("should return the complete if statement in which a variable was used", function() {
			expect(testContext.locationsFor("someValue").some(function(line) {
				return line.start.line === 27 && line.end.line === 32;
			})).toBe(true);

			expect(testContext.locationsFor("index").some(function(line) {
				return line.start.line === 27 && line.end.line === 32;
			})).toBe(true);
		});

		it("should return the complete loop in which a variable was used", function() {
			expect(testContext.locationsFor("howMany").some(function(line) {
				return line.start.line === 36 && line.end.line === 38;
			})).toBe(true);
		});

		it("should return the complete function in which a variable was used", function() {
			expect(testContext.locationsFor("y").some(function(line) {
				return line.start.line === 15 && line.end.line === 18;
			})).toBe(true);
		});
	});

});


		// context.scopeForLine(12);
		
		// context.linesForWithScopeOfLine("bla", 12);
		// context.lineFor("bla").withScopeOfLine(12);

describe("mustache.js", function() {
	testSource = fs.readFileSync("./spec/source/mustache.js", "utf8");
	 it("should not crash", function() {
	 	expect(testSource).toBeDefined();
	 	// var testContext = contextCollectAPI.getIdentifierMapping(testSource);
	 	// console.log(testContext);
	 	// expect(testContext.locationsFor("regExpMetaCharacters")).toBeDefined();
	 	// console.log(testContext.locationsFor("regExpMetaCharacters"));
	 	var mustacheScope = contextCollectAPI.scopeMappingForCode(testSource);
	 	expect(mustacheScope).toBeDefined();
	 });


});

