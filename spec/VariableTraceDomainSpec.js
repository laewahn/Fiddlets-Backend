/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global require, describe, it, expect */

"use strict";

describe("VariableTraceDomain", function() {
	var VariableTraceDomain = require("../VariableTraceDomain.js");

	it("should export the init function", function() {
		expect(VariableTraceDomain).toBeDefined();
		expect(VariableTraceDomain.init).toBeDefined();
	});

	describe("Tracing function", function() {
		it("should be exported", function() {
			expect(VariableTraceDomain.getTraceForCode).toBeDefined();
		});

		it("should return the trace as stringified JSON", function() {
			var trace = VariableTraceDomain.getTraceForCode("var bla = null;");
			expect(trace).toEqual("{\"bla\":null}");
		});

		it("should transform regular expressions into a JSON compatible format", function() {
			var trace = VariableTraceDomain.getTraceForCode("var bla = /\\S/g;");

			var traceObject = JSON.parse(trace);
			expect(traceObject.bla).toBeDefined();
			expect(traceObject.bla.__type).toEqual("RegExp");
			expect(traceObject.bla.global).toBe(true);
			expect(traceObject.bla.ignoreCase).toBe(false);
			expect(traceObject.bla.multiline).toBe(false);
			expect(traceObject.bla.source).toEqual("\\S");

			var revived = JSON.parse(trace, reviver);
			expect(revived.bla).toEqual(/\S/g);
		});

		it("should serialize functions", function() {
			var trace = VariableTraceDomain.getTraceForCode("function fun(v) {console.log(v);};");

			var traceObject = JSON.parse(trace);
			expect(traceObject.fun.__type).toEqual("Function");
			expect(traceObject.fun.source).toEqual("function fun(v) {\n    console.log(v);\n}");
			expect(traceObject.fun.params).toEqual(["v"]);
			
			var revived = JSON.parse(trace, reviver);
			expect(revived.fun instanceof Function).toBe(true);
		});

		it("should serialize functions that are declared in variables", function() {
			var trace = VariableTraceDomain.getTraceForCode("var fun = function(v) {console.log(v);};");

			var traceObject = JSON.parse(trace);
			expect(traceObject.fun.__type).toEqual("Function");
			expect(traceObject.fun.source).toEqual("function (v) {\n    console.log(v);\n}");
			expect(traceObject.fun.params).toEqual(["v"]);
			
			var revived = JSON.parse(trace, reviver);
			expect(revived.fun instanceof Function).toBe(true);
		});

		var reviver = function(key, value) {
			if (value.__type && value.__type === "RegExp") {
				var flags = [];

				if (value.global) flags.push("g");
				if (value.multiline) flags.push("m");
				if (value.ignoreCase) flags.push("i");

				return new RegExp(value.source, flags);
			}

			if (value.__type && value.__type == "Function") {
				/*jslint evil: true */
				return new Function(value.params, value.body);
			}
			
			return value;
		};

		it("should not fail.", function() {
			var fs = require("fs");
			var code = fs.readFileSync("./spec/fail.js");
			var trace = VariableTraceDomain.getTraceForCode(code);
			console.log(trace);
			var traceObject = JSON.parse(trace, reviver);

			console.log(traceObject);
			expect(traceObject.objectToString).toBeDefined();
			expect(traceObject.isArray).toBeDefined();
		});
	});
});