/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global module, require */

(function() {
	"use strict";

	var esprima = require("esprima");
	var escodegen = require("escodegen");
	var ASTApi = require("./ASTApi");

	function VariableTrace(source) {
		this.source = source;
		this.assignmentsWithLocations = [];
		this.trace = {};
	}

	VariableTrace.prototype.source = undefined;
	VariableTrace.prototype.assignmentsWithLocations = undefined;
	VariableTrace.prototype.trace = undefined;
	VariableTrace.prototype.instrumentedSource = undefined;

	VariableTrace.prototype.instrumentCode = function() {
		var ast = new ASTApi(esprima.parse(this.source), this.assignmentsWithLocations);
		ast.on("VariableDeclarator", function(declarator, collector, defaultBehaviour) {
			collector.push(declarator.id.name);
		});

		var instrumentedBody = [];

		ast.on("Program", function(program, collector, defaultBehaviour) {
			program.body.forEach(function(line, idx) {
				instrumentedBody.push(line);
				if (line.type === "VariableDeclaration") {
					line.declarations.forEach(function(declarator) {
						var tracingExpression = {
							type : "ExpressionStatement",
							expression: {
								type: "AssignmentExpression",
								operator: "=",
								left: {
									type: "Identifier",
									name: "__trace." + declarator.id.name,
								},
								right: {
										type: "Identifier",
										name: declarator.id.name
								}
							},
						};
						instrumentedBody.push(tracingExpression);
					});
				}
			});

			defaultBehaviour();
		});

		ast.trace();
		ast.ast.body = instrumentedBody;

		this.instrumentedSource = escodegen.generate(ast.ast);
	};

	VariableTrace.prototype.runCode = function() {

		function executeSandboxed(source) {
			var __trace = {};
			eval(source);

			return __trace;
		}

		this.trace = executeSandboxed(this.instrumentedSource);	
	};

	VariableTrace.prototype.getAssignments = function() {
		return this.assignmentsWithLocations;
	};

	module.exports = VariableTrace;
})();