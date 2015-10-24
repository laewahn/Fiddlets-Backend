/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global exports, require */

(function() {
	"use strict";

	var esprima = require("esprima");
	var ASTApi = require("./ASTApi");

	exports.infoForLine = function(line) {
		var wrappedLine = "function wrap() {\n" + line + "\n}";
		var wrapperAst = esprima.parse(wrappedLine, {loc: true});
		var ast = wrapperAst.body[0].body.body[0];

		var lineInfo = {
			type : [],
			info : {},
			ast : ast
		};
		
		var astTraverse = new ASTApi(lineInfo.ast, lineInfo);

		astTraverse.on("ReturnStatement", function(returnStatement, lineInfo) {
			lineInfo.info.returnStatement = {};
		});

		astTraverse.on("VariableDeclarator", function(declaration, lineInfo, defaultBehaviour) {
			lineInfo.info.declaration = {
				toName: declaration.id.name,
				toRange: [declaration.id.loc.start.column, declaration.id.loc.end.column]	
			};

			defaultBehaviour();
		});

		astTraverse.on("VariableDeclarator::Init", function(init, lineInfo, defaultBehaviour) {
			lineInfo.info.initialisation = {
				type: init.type,
				fromName: init.name,
				fromValue: init.value,
				fromRange: [init.loc.start.column, init.loc.end.column]
			};

			defaultBehaviour();
		});

		astTraverse.on("AssignmentExpression", function(expression, lineInfo, defaultBehaviour) {
			lineInfo.info.assignment = {
				toName: expression.left.name,
				toRange: [expression.left.loc.start.column, expression.left.loc.end.column],

				fromType: expression.right.type,
				fromName: expression.right.name,
				fromRange: [expression.right.loc.start.column, expression.right.loc.end.column]
			};

			defaultBehaviour();
		});

		astTraverse.on("CallExpression", function(call, lineInfo) {
			var callee;
			if (call.callee.type === "MemberExpression") {
				callee = {
					name: call.callee.object.name,
					range: [call.callee.object.loc.start.column, call.callee.object.loc.end.column]
				}
			} else if (call.callee.type === "Identifier") {
				callee = {
					name: call.callee.name,
					range: [call.callee.loc.start.column, call.callee.loc.end.column]
				}
			}

			lineInfo.info.functionCall = {
				type: call.type,
				callee: callee,
				params: []
			};

			if (call.callee.property !== undefined) {
				lineInfo.info.functionCall.method = {
					name: call.callee.property.name,
					range: [call.callee.property.loc.start.column, call.callee.property.loc.end.column]
				};
			}

			var paramValues = [];
			call.arguments.forEach(function(arg) {
				lineInfo.info.functionCall.params.push({
					type: arg.type,
					name: arg.name,
					value: arg.value,
					range: [arg.loc.start.column, arg.loc.end.column]
				});
				paramValues.push({
					type: arg.type,
					name: arg.name,
					value: arg.value,
					range: [arg.loc.start.column, arg.loc.end.column]
				});
			});
		});

		astTraverse.trace();

		return lineInfo;
	};

})();