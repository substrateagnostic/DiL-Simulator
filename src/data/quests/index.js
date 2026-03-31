// Quest definitions
export const QUESTS = {
  main_act1: {
    id: 'main_act1',
    name: 'Monday Morning',
    stages: [
      { id: 0, objective: 'Find your cubicle and settle in' },
      { id: 1, objective: 'Meet your coworkers' },
      { id: 2, objective: 'Report to Ross for your assignment' },
      { id: 3, objective: 'Handle the Henderson Trust meetings' },
      { id: 4, objective: 'Meet Karen Henderson in the Conference Room' },
    ],
  },
  main_act2: {
    id: 'main_act2',
    name: 'The Henderson Trust',
    stages: [
      { id: 0, objective: 'Meet Karen Henderson in the Conference Room' },
      { id: 1, objective: 'Meet Chad Henderson in the Conference Room' },
      { id: 2, objective: 'Meet Grandma Henderson in the Conference Room' },
      { id: 3, objective: 'Make your recommendation on the Henderson Trust' },
    ],
  },
  main_act2_finale: {
    id: 'main_act2_finale',
    name: 'The Reckoning',
    stages: [
      { id: 0, objective: 'Head to the Executive Floor' },
      { id: 1, objective: 'Face the consequences' },
    ],
  },
  main_act3: {
    id: 'main_act3',
    name: 'The Deeper Ledger',
    stages: [
      { id: 0, objective: 'Talk to Alex from IT about the encrypted partition' },
      { id: 1, objective: 'Find the Archive through the stairwell' },
      { id: 2, objective: 'Search the Archive for Henderson records' },
      { id: 3, objective: 'Confront the Janitor about his past' },
      { id: 4, objective: 'Return to Alex with the evidence' },
    ],
  },
  main_act4: {
    id: 'main_act4',
    name: 'The Trust Awakens',
    stages: [
      { id: 0, objective: 'Investigate the strange occurrences' },
      { id: 1, objective: 'Rally the team: Talk to Janet, Diane, and the Mysterious Janitor' },
      { id: 2, objective: 'Convince Ross to stand up for the department' },
      { id: 3, objective: 'Access the HR Department' },
      { id: 4, objective: 'Find the Vault behind the Archive' },
      { id: 5, objective: 'Retrieve the 1947 charter from the Vault' },
    ],
  },
  main_act5: {
    id: 'main_act5',
    name: 'Corporate Escalation',
    stages: [
      { id: 0, objective: 'Defend the department from the Restructuring Team' },
      { id: 1, objective: 'Defeat the Brand Consultant' },
      { id: 2, objective: 'Defeat the Corporate Lawyer' },
      { id: 3, objective: 'Access the Board Room' },
      { id: 4, objective: 'Confront Rachel in the Board Room' },
    ],
  },
  main_act6: {
    id: 'main_act6',
    name: 'Fiduciary Uprising',
    stages: [
      { id: 0, objective: 'Rally the team for the board meeting' },
      { id: 1, objective: 'Gather evidence against Rachel' },
      { id: 2, objective: 'Get Ross to prepare his speech' },
      { id: 3, objective: 'Recruit Grandma Henderson as ally' },
      { id: 4, objective: 'Get the Janitor\'s Rolex' },
    ],
  },
  main_act7: {
    id: 'main_act7',
    name: 'Trust Issues',
    stages: [
      { id: 0, objective: 'Ascend to the Penthouse' },
      { id: 1, objective: 'Defeat the CFO\'s Assistant' },
      { id: 2, objective: 'Defeat the Regional Director' },
      { id: 3, objective: 'Face The Algorithm' },
      { id: 4, objective: 'Choose the fate of the Trust Department' },
    ],
  },
  side_lunch_thief: {
    id: 'side_lunch_thief',
    name: 'The Lunch Thief',
    stages: [
      { id: 0, objective: 'Investigate the missing lunches' },
      { id: 1, objective: 'Check the break room fridge' },
      { id: 2, objective: 'Ask Janet about the thief' },
      { id: 3, objective: 'Confront the culprit' },
    ],
  },
  side_printer: {
    id: 'side_printer',
    name: 'The Printer from Hell',
    stages: [
      { id: 0, objective: 'Investigate the haunted printer' },
      { id: 1, objective: 'Ask Alex from IT about the printer' },
      { id: 2, objective: 'Find the printer\'s true purpose' },
    ],
  },
  side_server_secret: {
    id: 'side_server_secret',
    name: 'Server Room Secrets',
    stages: [
      { id: 0, objective: 'Explore the server room' },
      { id: 1, objective: 'Help Alex with his discovery' },
      { id: 2, objective: 'Decide what to do with the evidence' },
    ],
  },
  // Alex from IT Subquests
  anomaly_347: {
    id: 'anomaly_347',
    name: 'The 3:47 AM Anomaly',
    stages: [
      { id: 0, objective: 'Ask Alex from IT about the 3:47 AM signal' },
      { id: 1, objective: 'Find the Morse code pattern in the server room' },
      { id: 2, objective: 'Decode the Morse code message' },
      { id: 3, objective: 'Report back to Alex' },
    ],
  },
  legacy_admin: {
    id: 'legacy_admin',
    name: 'The Phantom Approver',
    stages: [
      { id: 0, objective: 'Help Alex investigate the phantom expense account' },
      { id: 1, objective: 'Find the paper expense trail in HR' },
      { id: 2, objective: 'Trace the source workstation in the Cubicle Farm' },
      { id: 3, objective: 'Return to Alex from IT' },
    ],
  },
  network_ghost: {
    id: 'network_ghost',
    name: 'Network Ghost',
    stages: [
      { id: 0, objective: 'Investigate network outages with Alex' },
      { id: 1, objective: 'Place signal booster in the break room' },
      { id: 2, objective: 'Place signal booster in the stairwell' },
      { id: 3, objective: 'Place signal booster in the executive floor' },
      { id: 4, objective: 'Return to Alex to triangulate the signal' },
    ],
  },
  daves_legacy: {
    id: 'daves_legacy',
    name: 'The Tuesday 2PM',
    stages: [
      { id: 0, objective: 'Help Alex identify the mystery scheduled task' },
      { id: 1, objective: 'Find the floppy disk in the Break Room' },
      { id: 2, objective: 'Find the decommissioned server tag in the Server Room' },
      { id: 3, objective: 'Find the sticky note in the Cubicle Farm' },
      { id: 4, objective: 'Return to Alex with all three artifacts' },
    ],
  },
  final_patch: {
    id: 'final_patch',
    name: 'The Unauthorized Patch',
    stages: [
      { id: 0, objective: 'Help Alex deploy his long-overdue security patch' },
      { id: 1, objective: 'Silence the network monitoring terminal' },
      { id: 2, objective: 'Defend the server room during the deploy' },
      { id: 3, objective: 'Patch deployed' },
    ],
  },
  // ATK side quests
  side_atk_1: {
    id: 'side_atk_1',
    name: 'Assertiveness Quotient',
    stages: [{ id: 0, objective: 'Fill out the Assertiveness Quotient chart' }],
  },
  side_atk_2: {
    id: 'side_atk_2',
    name: 'Raise Your Voice',
    stages: [{ id: 0, objective: 'Find the motivational plaque in the conference room' }],
  },
  side_atk_3: {
    id: 'side_atk_3',
    name: 'Coffee and Confrontation',
    stages: [{ id: 0, objective: 'Read the break room bulletin' }],
  },
  side_atk_4: {
    id: 'side_atk_4',
    name: 'Uptime Mentality',
    stages: [{ id: 0, objective: 'Review the server room performance poster' }],
  },
  side_atk_5: {
    id: 'side_atk_5',
    name: 'First Impressions',
    stages: [{ id: 0, objective: 'Read the reception assertiveness display' }],
  },
  // DEF side quests
  side_def_1: {
    id: 'side_def_1',
    name: 'Composure Under Pressure',
    stages: [{ id: 0, objective: 'Find the composure checklist in the cubicle farm' }],
  },
  side_def_2: {
    id: 'side_def_2',
    name: 'Agenda Management',
    stages: [{ id: 0, objective: 'Study the meeting agenda framework in the conference room' }],
  },
  side_def_3: {
    id: 'side_def_3',
    name: 'Emotional Bandwidth',
    stages: [{ id: 0, objective: 'Review the stress management guide in the break room' }],
  },
  side_def_4: {
    id: 'side_def_4',
    name: 'Redundancy Protocol',
    stages: [{ id: 0, objective: 'Read the redundancy protocol notice in the server room' }],
  },
  side_def_5: {
    id: 'side_def_5',
    name: 'The Waiting Game',
    stages: [{ id: 0, objective: 'Study the waiting room etiquette poster in reception' }],
  },
};
