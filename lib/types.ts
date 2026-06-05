export interface Plan {
  id: string;
  name: string;
  dates: string[];
  timeStart: number;
  timeEnd: number;
  timezone: string;
  createdAt: string;
  lockedSlot?: {
    date: string;
    slotIndex: number;
  };
}

export interface ParticipantAvailability {
  participantId: string;
  name: string;
  planId: string;
  slots: Record<string, number[]>;
  updatedAt: string;
}

export interface PlanWithParticipants {
  plan: Plan;
  participants: ParticipantAvailability[];
}
