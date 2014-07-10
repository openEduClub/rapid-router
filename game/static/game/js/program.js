var ocargo = ocargo || {};

ocargo.Program = function(instructionHandler) {
	this.instructionHandler = instructionHandler;
	this.stack = [];
	this.isTerminated = false;
	this.procedures = {};
};

ocargo.Program.prototype.step = function(level) {
	var stackLevel = this.stack[this.stack.length - 1];

	var commandToProcess = stackLevel.splice(0, 1)[0];
	if (stackLevel.length === 0) {
		this.stack.pop();
	}
	
	commandToProcess.execute(this, level);
};

ocargo.Program.prototype.canStep = function() {
	return this.stack.length !== 0 && this.stack[0].length !== 0;
};

ocargo.Program.prototype.addNewStackLevel = function(commands) {
	this.stack.push(commands);
};

ocargo.Program.prototype.terminate = function() {
	this.stack = [];
	this.isTerminated = true;
};

function If(conditionalCommandSets, elseCommands, block) {
	this.conditionalCommandSets = conditionalCommandSets;
	this.elseCommands = elseCommands;
	this.block = block;
}

If.prototype.execute = function(program, level) {
	this.block.selectWithConnected();

	this.executeIfCommand(program, level);

	setTimeout(program.stepCallback, 500);
};

If.prototype.executeIfCommand = function(program, level) {
	var i = 0;
	while (i < this.conditionalCommandSets.length) {
		if (this.conditionalCommandSets[i].condition(level)) {
			program.addNewStackLevel(this.conditionalCommandSets[i].commands.slice(0));
			return;
		}

		i++;
	}

	if(this.elseCommands) {
		program.addNewStackLevel(this.elseCommands.slice(0));
	}
};

function While(condition, body, block) {
	this.condition = condition;
	this.body = body;
	this.block = block;
}

While.prototype.execute = function(program, level) {
	this.block.selectWithConnected();

	if (this.condition(level)) {
		program.addNewStackLevel([this]);
		program.addNewStackLevel(this.body.slice(0));
	}

	setTimeout(program.stepCallback, 500);
};

function counterCondition(count) {
    return function() {
        if (count > 0) {
            count--;
            return true;
        }

        return false;
    };
}

function roadCondition(selection) {
    return function(level) {
        if (selection === 'FORWARD') {
            return FORWARD.getNextNode(level.van.previousNode, level.van.currentNode);
        } else if (selection === 'LEFT') {
            return TURN_LEFT.getNextNode(level.van.previousNode, level.van.currentNode);
        } else if (selection === 'RIGHT') {
            return TURN_RIGHT.getNextNode(level.van.previousNode, level.van.currentNode);
        }
    };
}

function deadEndCondition() {
    return function(level) {
        var instructions = [FORWARD, TURN_LEFT, TURN_RIGHT];
        for (var i = 0; i < instructions.length; i++) {
            var instruction = instructions[i];
            var nextNode = instruction.getNextNode(level.van.previousNode, level.van.currentNode);
            if (nextNode) {
                return false;
            }
        }
        return true;
    };
}

function negateCondition(otherCondition) {
	return function(level) {
		return !otherCondition(level);
	};
}

function atDestinationCondition() {
    return function(level) {
    	return level.van.currentNode === level.map.destination;
    };
}
function trafficLightCondition(lightColour){
	return function(level) {
        var prevNode = level.van.previousNode;
        var currNode = level.van.currentNode;
		for(var i = 0; i < currNode.trafficLights.length; i++){
			var tl = currNode.trafficLights[i];
			if(tl.sourceNode == prevNode && tl.state == lightColour){
				return true;
			}
		}
		return false;
    };
}

function TurnLeftCommand(block) {
	this.block = block;
}

TurnLeftCommand.prototype.execute = function(program) {
	this.block.selectWithConnected();
	program.instructionHandler.handleInstruction(TURN_LEFT, program);
};

function TurnRightCommand(block) {
	this.block = block;
}

TurnRightCommand.prototype.execute = function(program) {
	this.block.selectWithConnected();
	program.instructionHandler.handleInstruction(TURN_RIGHT, program);
};

function ForwardCommand(block) {
	this.block = block;
}

ForwardCommand.prototype.execute = function(program) {
	this.block.selectWithConnected();
	program.instructionHandler.handleInstruction(FORWARD, program);
};

function TurnAroundCommand(block) {
    this.block = block;
}

TurnAroundCommand.prototype.execute = function(program) {
    this.block.selectWithConnected();
    program.instructionHandler.handleInstruction(TURN_AROUND, program);
};

function WaitCommand(block) {
    this.block = block;
}

WaitCommand.prototype.execute = function(program) {
    this.block.selectWithConnected();
    program.instructionHandler.handleInstruction(WAIT, program);
};

function Procedure(name,body,block) {
	this.name = name;
	this.body = body;
	this.block = block;
};

Procedure.prototype.execute = function(program) {
	this.block.selectWithConnected();
	/* Slice necessary to shallow copy procedure body otherwise
	in the next call to the procedure the body is empty */
	program.addNewStackLevel(this.body.slice());
	setTimeout(program.stepCallback, 500);
}

function ProcedureCall(block) {
	this.block = block;
};

ProcedureCall.prototype.bind = function(proc) {
	this.proc = proc;
}

ProcedureCall.prototype.execute = function(program) {
	this.block.selectWithConnected();
	program.addNewStackLevel([this.proc]);
	setTimeout(program.stepCallback, 500);
}