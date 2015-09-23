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

		var reviver = function(key, value) {
			if (value.__type && value.__type === "RegExp") {
				var flags = [];

				if (value.global) flags.push("g");
				if (value.multiline) flags.push("m");
				if (value.ignoreCase) flags.push("i");

				return new RegExp(value.source, flags);
			}
			
			return value;
		};
	});
});