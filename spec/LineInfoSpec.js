/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

describe("Line info tests", function() {
	
	var lineInfo = require("../LineInfo");

	it("should include the line info module", function() {
		expect(lineInfo).toBeDefined();
	});

	describe("Line info", function() {
		it("should have the variable name for a declaration", function() {
			var testLine = "var foo;";
			var result = lineInfo.infoForLine(testLine);

			expect(result.type).toEqual(["Declaration"]);
			expect(result.lValue.name).toEqual("foo");
			expect(result.lValue.range).toEqual([4, 7]);
		});

		it("should have the assigned to variables name and range for an initialisation", function() {
			var testLine = "var foo = \"bar\";";
			var result = lineInfo.infoForLine(testLine);

			expect(result.type).toEqual(["Declaration", "Initialisation"]);
			expect(result.lValue.name).toEqual("foo");
			expect(result.lValue.range).toEqual([4, 7]);
		});

		it("should have the assignment name and range for an initialisation with another variable", function() {
			var testLine = "var foo = bar;";
			var result = lineInfo.infoForLine(testLine);

			expect(result.type).toEqual(["Declaration", "Initialisation"]);
			expect(result.rValue.name).toEqual("bar");
			expect(result.rValue.range).toEqual([10, 13]);
		});

		it("should have the value and range for an initialisation with a literal", function() {
			var testLine = "var foo = \"bar\";";
			var result = lineInfo.infoForLine(testLine);

			expect(result.type).toEqual(["Declaration", "Initialisation"]);
			expect(result.rValue.value).toEqual("bar");
			expect(result.rValue.range).toEqual([10, 15]);
		});

		it("should have the assigned to variables name and range as well as the assigned variable name and range for an assignment of a variable", function() {
			var testLine = "foo = bar;";
			var result = lineInfo.infoForLine(testLine);

			expect(result.type).toEqual(["Assignment"]);
			expect(result.lValue.name).toEqual("foo");
			expect(result.lValue.range).toEqual([0, 3]);
			expect(result.rValue.name).toEqual("bar");
			expect(result.rValue.range).toEqual([6, 9]);
		});

		it("should have all the information for a function call whose value is assigned to a variable", function() {
			var testLine = "var escaped = string.replace(htmlMetaCharacters, fromEntityMap);";
			var result = lineInfo.infoForLine(testLine);

			expect(result.type).toEqual(["Declaration", "Initialisation", "Function call"]);
			expect(result.lValue.name).toEqual("escaped");
			expect(result.lValue.range).toEqual([4, 11]);

			expect(result.rValue.type).toEqual("Function call");
			expect(result.rValue.callee.name).toEqual("string");
			expect(result.rValue.callee.range).toEqual([14, 20]);

			expect(result.rValue.method.name).toEqual("replace");
			expect(result.rValue.method.range).toEqual([21, 28]);

			expect(result.rValue.params.values[0].name).toEqual("htmlMetaCharacters");
			expect(result.rValue.params.values[1].name).toEqual("fromEntityMap");
			expect(result.rValue.params.range).toEqual([29, 62]);


			result = lineInfo.infoForLine("tagsToCompile = tagsToCompile.split(spaceRe, 1);");

			expect(result.rValue.callee.name).toEqual("tagsToCompile");
			expect(result.rValue.params.values[0].name).toEqual("spaceRe");
			expect(result.rValue.params.values[1].value).toEqual(1);
		});

		it("should include the ast for the line", function() {
			var result = lineInfo.infoForLine("tagsToCompile = tagsToCompile.split(spaceRe, 1);");

			expect(result.ast).toBeDefined();
		});
	});
});