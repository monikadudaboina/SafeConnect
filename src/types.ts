/**
 * SafeConnect Crisis Management Ecosystem
 * Type Definitions
 */

export type EntityStatus = 'active' | 'pending' | 'resolved' | 'dispatched';
export type StaffStatus = 'available' | 'on_task' | 'offline';
export type SenderType = 'guest' | 'staff' | 'responder' | 'system';

export interface Incident {
  id: string;
  type: string;
  severity: number;
  location: string;
  description: string;
  status: EntityStatus;
  reportedBy: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
  aiSummary?: string;
  actions?: string[];
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderType: SenderType;
  timestamp: any;
  translation?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  status: StaffStatus;
  location?: string;
}

export interface TriageResult {
  type: string;
  severity: number;
  location: string;
  description: string;
  actions: string[];
}
