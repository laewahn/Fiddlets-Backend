/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global require, exports */

(function(){
	"use strict";

	var VARIABLE_TRACER_DOMAIN = "VariableTraceDomain";
	var VARIABLE_TRACER_VERSION = {major: 0, minor: 1};

	var VariableTrace = require("./VariableTrace");

	exports.init = function(domainManager) {
		if(!domainManager.hasDomain(VARIABLE_TRACER_DOMAIN)) {
			domainManager.registerDomain(VARIABLE_TRACER_DOMAIN, VARIABLE_TRACER_VERSION);
		}

		domainManager.registerCommand(
			VARIABLE_TRACER_DOMAIN,
			"getTraceForCode",
			getTraceForCode,
			false,
			"Runs the given code and traces its results",
			[{
				name: "sourceCode",
				type: "string",
				description: "The code to run"
			}],
			[{
				name: "trace",
				type: "object",
				description: "The trace of the code that was run"
			}]
		);

	};

	var ASTApi = require("./ASTApi");
	var esprima = require("esprima");
	var escodegen = require("escodegen");

	function getTraceForCode(sourceCode) {
		var tracer = new VariableTrace(sourceCode);
		tracer.runCode();

		return JSON.stringify(tracer.trace, function(key, value) {
			if(value instanceof RegExp) {
				return {
					__type : "RegExp",
					global: value.global,
					ignoreCase: value.ignoreCase,
					multiline: value.multiline,
					source: value.source
				};
			}

			if(value instanceof Function) {
				var functionObject = {
					__type: "Function",
					source: value.toString()
				};

				var functionParser = new ASTApi(esprima.parse("var f = " + functionObject.source), functionObject);
				
				functionParser.on("FunctionExpression", function(theFunction, functionObject) {
					functionObject.params = [];

					theFunction.params.forEach(function(p) {
						functionObject.params.push(p.name);	
					});

					var lines = [];
					theFunction.body.body.forEach(function(line) {
						lines.push(escodegen.generate(line));
					});

					functionObject.body = lines.join("\n");
				});

				functionParser.trace();
				return functionObject;
			}

			return value;
		});
	}

	exports.getTraceForCode = getTraceForCode;

})();