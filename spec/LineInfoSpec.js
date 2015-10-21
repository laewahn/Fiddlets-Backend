/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

describe("Line info tests", function() {
	
	var lineInfo = require("../LineInfo");

	it("should include the line info module", function() {
		expect(lineInfo).toBeDefined();
	});

	it("should include the ast for the line", function() {
		var result = lineInfo.infoForLine("tagsToCompile = tagsToCompile.split(spaceRe, 1);");
		expect(result.ast).toBeDefined();
	});

	describe("Line info", function() {
		it("should have the variable name for a declaration", function() {
			var testLine = "var foo;";
			var result = lineInfo.infoForLine(testLine);

			
			expect(Object.keys(result.info)).toEqual(["declaration"]);
			var declaration = result.info.declaration;
			expect(declaration.toName).toEqual("foo");
			expect(declaration.toRange).toEqual([4, 7]);
		});

		it("should have the assigned to variables name and range for an initialisation", function() {
			var testLine = "var foo = \"bar\";";
			var result = lineInfo.infoForLine(testLine);

			expect(Object.keys(result.info)).toEqual(["declaration", "initialisation"]);
			
			var declaration = result.info.declaration;
			expect(declaration.toName).toEqual("foo");
			expect(declaration.toRange).toEqual([4, 7]);
		});

		it("should have the assignment name and range for an initialisation with another variable", function() {
			var testLine = "var foo = bar;";
			var result = lineInfo.infoForLine(testLine);

			expect(Object.keys(result.info)).toEqual(["declaration", "initialisation"]);
			
			var initialisation = result.info.initialisation;
			expect(initialisation.type).toEqual("Identifier");
			expect(initialisation.name).toEqual("bar");
			expect(initialisation.range).toEqual([10, 13]);
		});

		it("should have the value and range for an initialisation with a literal", function() {
			var testLine = "var foo = \"bar\";";
			var result = lineInfo.infoForLine(testLine);

			expect(Object.keys(result.info)).toEqual(["declaration", "initialisation"]);

			var initialisation = result.info.initialisation;
			expect(initialisation.type).toEqual("Literal");
			expect(initialisation.value).toEqual("bar");
			expect(initialisation.range).toEqual([10, 15])
		});

		it("should have the assigned to variables name and range as well as the assigned variable name and range for an assignment of a variable", function() {
			var testLine = "foo = bar;";
			var result = lineInfo.infoForLine(testLine);

			expect(Object.keys(result.info)).toEqual(["assignment"]);
			
			var assignment = result.info.assignment;
			expect(assignment.toName).toEqual("foo");
			expect(assignment.toRange).toEqual([0, 3]);
			
			expect(assignment.fromType).toEqual("Identifier");
			expect(assignment.fromName).toEqual("bar");
			expect(assignment.fromRange).toEqual([6, 9]);
		});

		it("should have all the information for a function call whose value is assigned to a variable", function() {
			var testLine = "var escaped = string.replace(htmlMetaCharacters, fromEntityMap);";
			var result = lineInfo.infoForLine(testLine);

			expect(Object.keys(result.info)).toEqual(["declaration", "initialisation", "functionCall"]);

			var declaration = result.info.declaration;
			expect(declaration.toName).toEqual("escaped");
			expect(declaration.toRange).toEqual([4, 11]);
			
			var initialisation = result.info.initialisation;
			expect(initialisation.type).toEqual("CallExpression");

			var functionCall = result.info.functionCall;
			expect(functionCall.type).toEqual("CallExpression");
			expect(functionCall.callee.name).toEqual("string");
			expect(functionCall.callee.range).toEqual([14, 20]);			

			expect(functionCall.method.name).toEqual("replace");
			expect(functionCall.method.range).toEqual([21, 28]);

			expect(functionCall.params.length).toEqual(2);
			expect(functionCall.params[0].name).toEqual("htmlMetaCharacters");
			expect(functionCall.params[0].type).toEqual("Identifier");
			expect(functionCall.params[0].range).toEqual([29, 47]);
			expect(functionCall.params[1].name).toEqual("fromEntityMap");
			expect(functionCall.params[1].type).toEqual("Identifier");
			expect(functionCall.params[1].range).toEqual([49, 62]);
			
			result = lineInfo.infoForLine("tagsToCompile = tagsToCompile.split(spaceRe, 1);");

			functionCall = result.info.functionCall;
			expect(functionCall.callee.name).toEqual("tagsToCompile");
			expect(functionCall.params[0].type).toEqual("Identifier");
			expect(functionCall.params[0].name).toEqual("spaceRe");

			expect(functionCall.params[1].type).toEqual("Literal");
			expect(functionCall.params[1].value).toEqual(1);
		});

		it("should have all the information for a function call without assignment", function() {
			var result = lineInfo.infoForLine("weatherInfoCSV.splice(0,0,csvHeader);");

			expect(Object.keys(result.info)).toEqual(["functionCall"]);
			
			var functionCall = result.info.functionCall;
			expect(functionCall.callee.name).toEqual("weatherInfoCSV");
			expect(functionCall.method.name).toEqual("splice");
			expect(functionCall.params[0].value).toEqual(0);
			expect(functionCall.params[1].value).toEqual(0);
			expect(functionCall.params[2].name).toEqual("csvHeader");
		});

	});
});