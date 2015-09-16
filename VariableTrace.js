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

		ast.on("VariableDeclarator", function(declarator, instrumentedBody) {

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

		

		ast.on("Program", function(program, instrumentedBody, defaultBehaviour) {
			program.body.forEach(function(line) {
				instrumentedBody.push(line);
			});

			defaultBehaviour();

			program.body = instrumentedBody;
		});

		ast.trace();
		this.instrumentedSource = ast.generatedCode();
	};

	module.exports = VariableTrace;
})();