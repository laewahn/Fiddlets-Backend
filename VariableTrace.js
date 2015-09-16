/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global module, require */

(function() {
	"use strict";

	var esprima = require("esprima");
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

	VariableTrace.prototype.runCode = function() {

		function executeSandboxed(source) {
			var __trace = {};
			// console.log(source);
			eval(source);

			return __trace;
		}

		this._instrumentCode();
		this.trace = executeSandboxed(this.instrumentedSource);	
	};

	VariableTrace.prototype.getAssignments = function() {
		return Object.keys(this.trace);
	};

	VariableTrace.prototype._instrumentCode = function() {
		var ast = new ASTApi(esprima.parse(this.source), []);

		ast.on("Program", function(program, instrumentedBody) {
			program.body.forEach(function(line) {
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

				if (line.type === "ExpressionStatement" && line.expression.type === "AssignmentExpression") {
					var tracingExpression = {
						type : "ExpressionStatement",
						expression: {
							type: "AssignmentExpression",
							operator: "=",
							left: {
								type: "Identifier",
								name: "__trace." + line.expression.left.name,
							},
							right: line.expression.right
						},
					};
					instrumentedBody.push(tracingExpression);
				}
			});

			program.body = instrumentedBody;
		});

		ast.trace();
		this.instrumentedSource = ast.generatedCode();
	};

	module.exports = VariableTrace;
})();