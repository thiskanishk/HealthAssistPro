const { Configuration, OpenAIApi } = require('openai');
const config = require('../config');
const aiLearning = require('./aiLearning');

const configuration = new Configuration({
  apiKey: config.openai.apiKey
});

const openai = new OpenAIApi(configuration);

class AITaskManager {
  constructor() {
    this.model = config.openai.model;
    this.maxTokens = config.openai.maxTokens;
  }

  /**
   * Predict optimal task assignment based on historical data and current context
   */
  async predictOptimalAssignment(task, availableStaff, historicalData) {
    try {
      const prompt = this.formatAssignmentPrompt(task, availableStaff, historicalData);
      
      const completion = await openai.createChatCompletion({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an AI healthcare task management assistant. Analyze staff workload, 
            expertise, historical performance, and current context to recommend optimal task assignments. 
            Consider factors like staff specialization, experience level, current workload, 
            historical task completion rates, and task urgency.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      let prediction = this.parseAssignmentResponse(completion.data.choices[0].message.content);

      // Apply learning adjustments
      prediction = await aiLearning.applyLearningAdjustments('task_assignment', prediction);

      return prediction;
    } catch (error) {
      console.error('Error predicting task assignment:', error);
      throw new Error('Failed to predict optimal task assignment');
    }
  }

  /**
   * Predict task priority and deadline based on context
   */
  async predictTaskPriority(task, departmentWorkload, patientContext) {
    try {
      const prompt = this.formatPriorityPrompt(task, departmentWorkload, patientContext);

      const completion = await openai.createChatCompletion({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an AI healthcare priority assessment assistant. 
            Analyze task context, patient history, department workload, and resource availability 
            to recommend task priority and optimal deadline.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.2
      });

      let prediction = this.parsePriorityResponse(completion.data.choices[0].message.content);

      // Apply learning adjustments
      prediction = await aiLearning.applyLearningAdjustments('task_priority', prediction);

      return prediction;
    } catch (error) {
      console.error('Error predicting task priority:', error);
      throw new Error('Failed to predict task priority');
    }
  }

  /**
   * Predict potential bottlenecks and resource constraints
   */
  async predictBottlenecks(departmentTasks, staffAvailability, resourceUtilization) {
    try {
      const prompt = this.formatBottleneckPrompt(departmentTasks, staffAvailability, resourceUtilization);

      const completion = await openai.createChatCompletion({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an AI healthcare resource management assistant. 
            Analyze current and planned tasks, staff availability, and resource utilization 
            to identify potential bottlenecks and suggest mitigation strategies.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.3
      });

      let prediction = this.parseBottleneckResponse(completion.data.choices[0].message.content);

      // Apply learning adjustments
      prediction = await aiLearning.applyLearningAdjustments('bottleneck', prediction);

      return prediction;
    } catch (error) {
      console.error('Error predicting bottlenecks:', error);
      throw new Error('Failed to predict bottlenecks');
    }
  }

  formatAssignmentPrompt(task, availableStaff, historicalData) {
    return `
Task Information:
${JSON.stringify(task, null, 2)}

Available Staff:
${availableStaff.map(staff => `
- Name: ${staff.name}
  Specialization: ${staff.specialization}
  Experience: ${staff.experience} years
  Current Workload: ${staff.currentWorkload}
  Performance Score: ${staff.performanceScore}
`).join('\n')}

Historical Performance Data:
${JSON.stringify(historicalData, null, 2)}

Please analyze and recommend:
1. Best staff member for this task
2. Confidence score (0-100%)
3. Reasoning for the recommendation
4. Potential risks and mitigation strategies
`;
  }

  formatPriorityPrompt(task, departmentWorkload, patientContext) {
    return `
Task Details:
${JSON.stringify(task, null, 2)}

Department Workload:
${JSON.stringify(departmentWorkload, null, 2)}

Patient Context:
${JSON.stringify(patientContext, null, 2)}

Please analyze and provide:
1. Recommended priority level (1-5)
2. Suggested deadline
3. Reasoning for recommendations
4. Critical factors considered
`;
  }

  formatBottleneckPrompt(departmentTasks, staffAvailability, resourceUtilization) {
    return `
Department Tasks:
${JSON.stringify(departmentTasks, null, 2)}

Staff Availability:
${JSON.stringify(staffAvailability, null, 2)}

Resource Utilization:
${JSON.stringify(resourceUtilization, null, 2)}

Please analyze and provide:
1. Potential bottlenecks in next 24-48 hours
2. Risk level for each bottleneck
3. Recommended mitigation strategies
4. Resource optimization suggestions
`;
  }

  parseAssignmentResponse(response) {
    try {
      const sections = response.split('\n\n');
      return {
        assignedTo: sections[0].split(':')[1].trim(),
        confidence: parseInt(sections[1].match(/\d+/)[0]),
        reasoning: sections[2],
        risks: sections[3].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2))
      };
    } catch (error) {
      throw new Error('Failed to parse assignment response');
    }
  }

  parsePriorityResponse(response) {
    try {
      const sections = response.split('\n\n');
      return {
        priority: parseInt(sections[0].match(/\d+/)[0]),
        deadline: new Date(sections[1].split(':')[1].trim()),
        reasoning: sections[2],
        criticalFactors: sections[3].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2))
      };
    } catch (error) {
      throw new Error('Failed to parse priority response');
    }
  }

  parseBottleneckResponse(response) {
    try {
      const sections = response.split('\n\n');
      return {
        bottlenecks: sections[0].split('\n').filter(line => line.startsWith('-')).map(line => ({
          issue: line.slice(2),
          risk: sections[1].split('\n').find(r => r.includes(line.slice(2)))?.match(/high|medium|low/)[0]
        })),
        mitigationStrategies: sections[2].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2)),
        optimizationSuggestions: sections[3].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2))
      };
    } catch (error) {
      throw new Error('Failed to parse bottleneck response');
    }
  }
}

module.exports = new AITaskManager(); 