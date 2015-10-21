/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global exports, require */

(function() {
	"use strict";

	var esprima = require("esprima");
	var ASTApi = require("./ASTApi");

	exports.infoForLine = function(line) {
		var lineInfo = {
			type : [],
			info : {},
			ast : esprima.parse(line, {loc: true})
		};
		
		var astTraverse = new ASTApi(lineInfo.ast, lineInfo);

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
				name: init.name,
				value: init.value,
				range: [init.loc.start.column, init.loc.end.column]
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
			lineInfo.info.functionCall = {
				type: call.type,
				callee: {
					name: call.callee.object.name,
					range: [call.callee.object.loc.start.column, call.callee.object.loc.end.column]
				},
				method: {
					name: call.callee.property.name,
					range: [call.callee.property.loc.start.column, call.callee.property.loc.end.column]
				},
				params: []
			};

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