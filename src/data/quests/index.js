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
      { id: 1, objective: 'Find the Archive in the parking garage' },
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
      { id: 1, objective: 'Rally the team against Rachel\'s lockdown' },
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
};
