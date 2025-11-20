import axios from 'axios';
import { ethers } from 'ethers';

/**
 * Mimic Protocol Integration
 * Mimic is a protocol for automated smart contract execution
 * We use it to automatically expire rentals when the rental period ends
 */

const MIMIC_API_URL = process.env.MIMIC_API_URL || 'https://api.mimic.fi/v1';
const MIMIC_API_KEY = process.env.MIMIC_API_KEY;
const MIMIC_WEBHOOK_SECRET = process.env.MIMIC_WEBHOOK_SECRET;

export interface MimicTask {
  id: string;
  name: string;
  contractAddress: string;
  functionSelector: string;
  executionTime: number; // Unix timestamp
  parameters: any[];
  status: 'pending' | 'executed' | 'failed';
}

export interface CreateMimicTaskParams {
  name: string;
  contractAddress: string;
  functionName: string;
  functionSelector: string;
  parameters: any[];
  executionTime: number; // Unix timestamp when task should execute
  webhookUrl?: string; // Optional webhook for notifications
}

export class MimicClient {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    if (!MIMIC_API_KEY) {
      console.warn('⚠️  MIMIC_API_KEY not set - Mimic integration will use mock mode');
    }
    this.apiKey = MIMIC_API_KEY || 'mock_api_key';
    this.apiUrl = MIMIC_API_URL;
  }

  /**
   * Create a scheduled task to execute a contract function at a specific time
   * For rentals, this will call expireRental(rentalId) when the rental period ends
   */
  async createTask(params: CreateMimicTaskParams): Promise<string> {
    if (!MIMIC_API_KEY) {
      // Mock mode - return a fake task ID
      const mockTaskId = `mock_task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      console.log('📝 [MOCK] Created Mimic task:', {
        taskId: mockTaskId,
        name: params.name,
        contractAddress: params.contractAddress,
        functionName: params.functionName,
        executionTime: new Date(params.executionTime * 1000).toISOString(),
        parameters: params.parameters
      });
      return mockTaskId;
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/tasks`,
        {
          name: params.name,
          contract_address: params.contractAddress,
          function_selector: params.functionSelector,
          parameters: params.parameters,
          execution_time: params.executionTime,
          webhook_url: params.webhookUrl,
          network: 'mendoza-testnet' // Arkiv's Mendoza testnet
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const taskId = response.data.task_id || response.data.id;
      console.log('✅ Created Mimic task:', taskId);
      return taskId;
    } catch (error: any) {
      console.error('❌ Failed to create Mimic task:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      throw new Error(`Mimic task creation failed: ${error.message}`);
    }
  }

  /**
   * Create a rental expiration task
   * This will automatically call expireRental(rentalId) when the rental expires
   */
  async createRentalExpirationTask(
    rentalId: string,
    contractAddress: string,
    expirationTime: Date,
    webhookUrl?: string
  ): Promise<string> {
    const executionTime = Math.floor(expirationTime.getTime() / 1000);
    
    // Function selector for expireRental(string)
    // Derived from function signature using keccak256
    const functionSelector = ethers.id('expireRental(string)').substring(0, 10);

    const taskId = await this.createTask({
      name: `Expire rental ${rentalId}`,
      contractAddress,
      functionName: 'expireRental',
      functionSelector,
      parameters: [rentalId],
      executionTime,
      webhookUrl
    });

    console.log(`📅 Scheduled rental expiration for ${rentalId} at ${expirationTime.toISOString()}`);
    return taskId;
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<MimicTask | null> {
    if (!MIMIC_API_KEY) {
      // Mock mode
      return {
        id: taskId,
        name: 'Mock task',
        contractAddress: '0x0000000000000000000000000000000000000000',
        functionSelector: '0x00000000',
        executionTime: Date.now() / 1000,
        parameters: [],
        status: 'pending'
      };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get task status:', error.message);
      return null;
    }
  }

  /**
   * Cancel a scheduled task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    if (!MIMIC_API_KEY) {
      // Mock mode
      console.log('📝 [MOCK] Cancelled Mimic task:', taskId);
      return true;
    }

    try {
      await axios.delete(
        `${this.apiUrl}/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      console.log('✅ Cancelled Mimic task:', taskId);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to cancel task:', error.message);
      return false;
    }
  }

  /**
   * List all tasks
   */
  async listTasks(status?: 'pending' | 'executed' | 'failed'): Promise<MimicTask[]> {
    if (!MIMIC_API_KEY) {
      // Mock mode
      return [];
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/tasks`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          params: status ? { status } : undefined
        }
      );

      return response.data.tasks || [];
    } catch (error: any) {
      console.error('❌ Failed to list tasks:', error.message);
      return [];
    }
  }
}

// Export singleton instance
export const mimicClient = new MimicClient();
