/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global module, require */

(function() {
	"use strict";

	var esprima = require("esprima");
	var ASTApi = require("./ASTApi");

	function VariableTrace(source) {
		this.source = source;
		this.trace = {};
	}

	VariableTrace.prototype.source = undefined;
	VariableTrace.prototype.trace = undefined;
	VariableTrace.prototype.instrumentedSource = undefined;

	VariableTrace.prototype.runCode = function() {

		function executeSandboxed(source) {
			var __trace = {};
			// console.log("Source: " + source);
			/*jslint evil: true */
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

		ast.on("Program", function(program, instrumentedBody, defaultBehaviour){
			defaultBehaviour();
			program.body = instrumentedBody;
		});

		ast.on("Program::Body::Line", function(line, instrumentedBody, defaultBehaviour) {
				instrumentedBody.push(line);
				defaultBehaviour();
		});

		ast.on("VariableDeclarator", function(declarator, instrumentedBody) {
			instrumentedBody.push(tracingExpressionForVariableWithValue(declarator.id, declarator.id));
		});

		ast.on("AssignmentExpression", function(expression, instrumentedBody) {
			instrumentedBody.push(tracingExpressionForVariableWithValue(expression.left, expression.right));
		});

		ast.on("FunctionDeclaration", function(theFunction, instrumentedBody) {			
			theFunction.type = "FunctionExpression";

			var tracingExpressionForFunction = tracingExpressionForVariableWithValue(theFunction.id, theFunction);
			instrumentedBody.push(tracingExpressionForFunction);
		});

		ast.trace();
		this.instrumentedSource = ast.generatedCode();
	};

	function tracingExpressionForVariableWithValue(variable, value) {
		return {
					type : "ExpressionStatement",
					expression: {
						type: "AssignmentExpression",
						operator: "=",
						left: {
							type: "Identifier",
							name: "__trace." + variable.name,
						},
						right: value
					},
				};
	}

	module.exports = VariableTrace;
	
})();