/**
 * Agent-based functionality for Terminal AI
 * This allows the AI to act as an agent with more advanced capabilities
 */

import { type Config } from "./config"
import { getAllModels } from "./models"

export interface AgentAction {
  type: string
  params: Record<string, any>
}

export interface AgentResult {
  success: boolean
  message: string
  data?: any
}

export interface AgentOptions {
  maxSteps?: number
  verbose?: boolean
}

export class Agent {
  private config: Config
  private maxSteps: number
  private verbose: boolean
  private history: AgentAction[] = []

  constructor(config: Config, options: AgentOptions = {}) {
    this.config = config
    this.maxSteps = options.maxSteps || 5
    this.verbose = options.verbose || false
  }

  /**
   * Run an agent workflow with the specified goal
   */
  async run(goal: string): Promise<AgentResult> {
    const models = await getAllModels(true)
    const defaultModel = models.find(m => m.id === this.config.default_model) || models[0]
    
    if (!defaultModel) {
      return {
        success: false,
        message: "No AI model available"
      }
    }

    if (this.verbose) {
      console.log(`Using model: ${defaultModel.id}`)
      console.log(`Goal: ${goal}`)
    }

    try {
      // In a real implementation, this would interact with the AI model
      // to create a plan and execute it step by step
      
      return {
        success: true,
        message: `Successfully executed plan for: ${goal}`,
        data: {
          steps: this.history,
          model: defaultModel.id
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to execute agent workflow: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * Add an action to the agent history
   */
  addAction(action: AgentAction): void {
    this.history.push(action)
  }

  /**
   * Get the agent's action history
   */
  getHistory(): AgentAction[] {
    return [...this.history]
  }

  /**
   * Clear the agent's action history
   */
  clearHistory(): void {
    this.history = []
  }
} 