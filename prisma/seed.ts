import {
  InventoryItemStatus,
  InventoryTrackingMode,
  PrismaClient,
  ProjectStatus,
  RecurrenceFrequency,
  ShoppingDealType,
  ShoppingTripItemStatus,
  ShoppingTripStatus,
  TaskStatus,
  TaskType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@homemanager.app';
const DEMO_PASSWORD = 'demo1234';

// Date-only values relative to today (UTC midnight), so the demo always has overdue/today/upcoming items.
function day(offset: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

function at(offset: number, hour: number): Date {
  const d = day(offset);
  d.setUTCHours(hour);
  return d;
}

async function main() {
  // Rebuild from scratch: deleting the user cascades to owned homes and everything under them.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      firstName: 'Demo',
      lastName: 'User',
    },
  });

  const home = await prisma.home.create({ data: { name: 'Maple Street House', ownerId: user.id } });
  const homeId = home.id;

  const roomDefs = [
    { name: 'Kitchen', roomEmoji: '🍳' },
    { name: 'Living Room', roomEmoji: '🛋️' },
    { name: 'Primary Bedroom', roomEmoji: '🛏️' },
    { name: 'Guest Bedroom', roomEmoji: '🧸' },
    { name: 'Bathroom', roomEmoji: '🛁' },
    { name: 'Laundry Room', roomEmoji: '🧺' },
    { name: 'Garage', roomEmoji: '🚗' },
    { name: 'Backyard', roomEmoji: '🌳' },
  ];
  const rooms: Record<string, bigint> = {};
  for (const def of roomDefs) {
    const room = await prisma.room.create({ data: { ...def, homeId } });
    rooms[def.name] = room.id;
  }

  await prisma.note.createMany({
    data: [
      { roomId: rooms['Kitchen'], content: 'Fridge water filter is model EDR1RXD1. Last replaced in spring.' },
      { roomId: rooms['Kitchen'], content: 'Dishwasher warranty runs through March 2028 — receipt is in the junk drawer folder.' },
      { roomId: rooms['Living Room'], content: 'Wall paint: Sherwin-Williams Agreeable Gray (SW 7029), eggshell.' },
      { roomId: rooms['Bathroom'], content: 'Shower valve cartridge is Moen 1222. Shutoff is behind the access panel in the hall closet.' },
      { roomId: rooms['Laundry Room'], content: 'Main water shutoff is behind the water heater.' },
      { roomId: rooms['Garage'], content: 'Furnace filter size: 16x25x1. Breaker panel is on the east wall.' },
      { roomId: rooms['Backyard'], content: 'Sprinkler zones: 1 = front lawn, 2 = side beds, 3 = back lawn. Controller is in the garage.' },
    ],
  });

  // Projects
  const kitchenBacksplash = await prisma.project.create({
    data: {
      homeId,
      roomId: rooms['Kitchen'],
      assigneeId: user.id,
      name: 'Kitchen backsplash',
      description: 'Replace the old laminate backsplash with white subway tile.',
      status: ProjectStatus.IN_PROGRESS,
      targetCompletionDate: day(14),
      estimatedCost: 650,
      actualCost: 312.45,
      materials: {
        create: [
          { name: 'White subway tile (3x6, box of 40)', quantity: 6, unitCost: 32.98, purchased: true },
          { name: 'Premixed thinset mortar', quantity: 2, unitCost: 24.97, purchased: true },
          { name: 'Unsanded grout (bright white)', quantity: 1, unitCost: 18.48, purchased: false },
          { name: 'Tile spacers (1/16")', quantity: 1, unitCost: 4.98, purchased: true },
          { name: 'Wet tile saw rental (1 day)', quantity: 1, unitCost: 65, purchased: false },
        ],
      },
    },
  });

  const deckRefinish = await prisma.project.create({
    data: {
      homeId,
      roomId: rooms['Backyard'],
      assigneeId: user.id,
      name: 'Refinish back deck',
      description: 'Power wash, sand, and re-stain the deck before winter.',
      status: ProjectStatus.NOT_STARTED,
      targetCompletionDate: day(30),
      estimatedCost: 420,
      materials: {
        create: [
          { name: 'Semi-transparent deck stain (gallon)', quantity: 3, unitCost: 46.98, purchased: false },
          { name: 'Deck cleaner concentrate', quantity: 1, unitCost: 21.97, purchased: false },
          { name: '80-grit sanding pads', quantity: 2, unitCost: 12.97, purchased: false },
          { name: 'Stain applicator pad', quantity: 2, unitCost: 9.98, purchased: false },
        ],
      },
    },
  });

  const guestRoomRefresh = await prisma.project.create({
    data: {
      homeId,
      roomId: rooms['Guest Bedroom'],
      name: 'Guest room refresh',
      description: 'New paint, curtains, and a bedside lamp before the holidays.',
      status: ProjectStatus.IN_PROGRESS,
      targetCompletionDate: day(45),
      estimatedCost: 380,
      actualCost: 96.5,
      materials: {
        create: [
          { name: 'Interior paint (gallon)', quantity: 2, unitCost: 48.25, purchased: true },
          { name: 'Blackout curtains (pair)', quantity: 1, unitCost: 59.99, purchased: false },
          { name: 'Bedside lamp', quantity: 1, unitCost: 34.99, purchased: false },
        ],
      },
    },
  });

  const garageShelving = await prisma.project.create({
    data: {
      homeId,
      roomId: rooms['Garage'],
      assigneeId: user.id,
      name: 'Garage shelving',
      description: 'Install wall-mounted shelving for bins and seasonal gear.',
      status: ProjectStatus.COMPLETED,
      targetCompletionDate: day(-20),
      completedDate: day(-24),
      estimatedCost: 250,
      actualCost: 231.86,
      materials: {
        create: [
          { name: 'Heavy-duty shelf brackets', quantity: 8, unitCost: 7.98, purchased: true },
          { name: '2x12 shelf boards (8 ft)', quantity: 4, unitCost: 22.47, purchased: true },
          { name: 'Clear storage bins', quantity: 8, unitCost: 9.97, purchased: true },
        ],
      },
    },
  });

  await prisma.project.create({
    data: {
      homeId,
      roomId: rooms['Bathroom'],
      name: 'Replace bathroom vanity',
      description: 'Swap the builder-grade vanity for a 36" model with more storage.',
      status: ProjectStatus.NOT_STARTED,
      targetCompletionDate: day(90),
      estimatedCost: 900,
    },
  });

  // Tasks
  type TaskSeed = {
    title: string;
    type: TaskType;
    room?: string;
    projectId?: bigint;
    due?: number;
    status?: TaskStatus;
    completedDaysAgo?: number;
    recurrence?: RecurrenceFrequency;
    interval?: number;
    notes?: string;
    assigned?: boolean;
  };

  const taskSeeds: TaskSeed[] = [
    // Overdue
    { title: 'Replace HVAC filter', type: TaskType.MAINTENANCE, room: 'Garage', due: -3, recurrence: RecurrenceFrequency.MONTHLY, interval: 3, notes: '16x25x1, MERV 11', assigned: true },
    { title: 'Clean out gutters', type: TaskType.MAINTENANCE, room: 'Backyard', due: -5, recurrence: RecurrenceFrequency.YEARLY, interval: 1 },
    { title: 'Wipe down kitchen cabinets', type: TaskType.CLEANING, room: 'Kitchen', due: -1, recurrence: RecurrenceFrequency.MONTHLY, interval: 1 },

    // Today
    { title: 'Run dishwasher cleaning cycle', type: TaskType.MAINTENANCE, room: 'Kitchen', due: 0, recurrence: RecurrenceFrequency.MONTHLY, interval: 1, assigned: true },
    { title: 'Vacuum living room', type: TaskType.CLEANING, room: 'Living Room', due: 0, recurrence: RecurrenceFrequency.WEEKLY, interval: 1, assigned: true },
    { title: 'Take out recycling', type: TaskType.CLEANING, room: 'Garage', due: 0, recurrence: RecurrenceFrequency.WEEKLY, interval: 1 },
    { title: 'Water indoor plants', type: TaskType.CLEANING, room: 'Living Room', due: 0, recurrence: RecurrenceFrequency.WEEKLY, interval: 1 },
    { title: 'Grout the backsplash', type: TaskType.PROJECT, room: 'Kitchen', projectId: kitchenBacksplash.id, due: 0, assigned: true },

    // Upcoming
    { title: 'Wash bed sheets', type: TaskType.CLEANING, room: 'Primary Bedroom', due: 1, recurrence: RecurrenceFrequency.WEEKLY, interval: 1 },
    { title: 'Scrub shower and tub', type: TaskType.CLEANING, room: 'Bathroom', due: 2, recurrence: RecurrenceFrequency.WEEKLY, interval: 2 },
    { title: 'Clean dryer vent', type: TaskType.MAINTENANCE, room: 'Laundry Room', due: 4, recurrence: RecurrenceFrequency.YEARLY, interval: 1, notes: 'Disconnect the duct and run the brush kit all the way to the exterior flap.' },
    { title: 'Test smoke and CO detectors', type: TaskType.MAINTENANCE, due: 5, recurrence: RecurrenceFrequency.MONTHLY, interval: 6, assigned: true },
    { title: 'Mop kitchen floor', type: TaskType.CLEANING, room: 'Kitchen', due: 3, recurrence: RecurrenceFrequency.WEEKLY, interval: 1 },
    { title: 'Seal grout lines', type: TaskType.PROJECT, room: 'Kitchen', projectId: kitchenBacksplash.id, due: 4 },
    { title: 'Caulk backsplash edge at countertop', type: TaskType.PROJECT, room: 'Kitchen', projectId: kitchenBacksplash.id, due: 5 },
    { title: 'Flush water heater', type: TaskType.MAINTENANCE, room: 'Laundry Room', due: 10, recurrence: RecurrenceFrequency.YEARLY, interval: 1 },
    { title: 'Winterize sprinkler system', type: TaskType.MAINTENANCE, room: 'Backyard', due: 21, recurrence: RecurrenceFrequency.YEARLY, interval: 1, notes: 'Schedule blowout before first hard freeze.' },
    { title: 'Power wash deck', type: TaskType.PROJECT, room: 'Backyard', projectId: deckRefinish.id, due: 12, assigned: true },
    { title: 'Sand deck boards', type: TaskType.PROJECT, room: 'Backyard', projectId: deckRefinish.id, due: 19 },
    { title: 'Apply deck stain', type: TaskType.PROJECT, room: 'Backyard', projectId: deckRefinish.id, due: 26 },
    { title: 'Hang new curtains', type: TaskType.PROJECT, room: 'Guest Bedroom', projectId: guestRoomRefresh.id, due: 15 },
    { title: 'Dust ceiling fans', type: TaskType.CLEANING, room: 'Primary Bedroom', due: 8, recurrence: RecurrenceFrequency.MONTHLY, interval: 1 },
    { title: 'Deep clean refrigerator', type: TaskType.CLEANING, room: 'Kitchen', due: 9, recurrence: RecurrenceFrequency.MONTHLY, interval: 3 },
    { title: 'Organize hall closet', type: TaskType.CLEANING },

    // Done
    { title: 'Remove old backsplash', type: TaskType.PROJECT, room: 'Kitchen', projectId: kitchenBacksplash.id, due: -10, status: TaskStatus.DONE, completedDaysAgo: 11, assigned: true },
    { title: 'Set subway tile', type: TaskType.PROJECT, room: 'Kitchen', projectId: kitchenBacksplash.id, due: -3, status: TaskStatus.DONE, completedDaysAgo: 2, assigned: true },
    { title: 'Paint guest room walls', type: TaskType.PROJECT, room: 'Guest Bedroom', projectId: guestRoomRefresh.id, due: -6, status: TaskStatus.DONE, completedDaysAgo: 6 },
    { title: 'Mount shelf brackets', type: TaskType.PROJECT, room: 'Garage', projectId: garageShelving.id, due: -27, status: TaskStatus.DONE, completedDaysAgo: 27 },
    { title: 'Install shelf boards and bins', type: TaskType.PROJECT, room: 'Garage', projectId: garageShelving.id, due: -24, status: TaskStatus.DONE, completedDaysAgo: 24 },
    { title: 'Clean bathroom mirrors', type: TaskType.CLEANING, room: 'Bathroom', due: -1, status: TaskStatus.DONE, completedDaysAgo: 1 },
    { title: 'Replace fridge water filter', type: TaskType.MAINTENANCE, room: 'Kitchen', due: -14, status: TaskStatus.DONE, completedDaysAgo: 15 },
    { title: 'Vacuum living room', type: TaskType.CLEANING, room: 'Living Room', due: -7, status: TaskStatus.DONE, completedDaysAgo: 7 },
    { title: 'Fix squeaky bedroom door', type: TaskType.MAINTENANCE, room: 'Primary Bedroom', due: -4, status: TaskStatus.DONE, completedDaysAgo: 4 },

    // Cancelled
    { title: 'Reseal driveway', type: TaskType.MAINTENANCE, due: -30, status: TaskStatus.CANCELLED, notes: 'Hiring this out next spring instead.' },
  ];

  await prisma.task.createMany({
    data: taskSeeds.map((t) => ({
      homeId,
      title: t.title,
      type: t.type,
      notes: t.notes ?? null,
      status: t.status ?? TaskStatus.TODO,
      dueDate: t.due === undefined ? null : day(t.due),
      completedAt: t.completedDaysAgo === undefined ? null : at(-t.completedDaysAgo, 18),
      recurrenceFrequency: t.recurrence ?? RecurrenceFrequency.NONE,
      recurrenceInterval: t.interval ?? 1,
      roomId: t.room ? rooms[t.room] : null,
      projectId: t.projectId ?? null,
      assigneeId: t.assigned ? user.id : null,
    })),
  });

  // Inventory
  type InventorySeed = {
    name: string;
    category: string;
    room: string;
    quantity: number;
    minQuantity: number;
    price?: number;
    trackingMode?: InventoryTrackingMode;
    status?: InventoryItemStatus;
    stores?: string[];
    tags?: string[];
    lastPurchased?: number;
    expires?: number;
    description?: string;
    notes?: string;
  };

  const inventorySeeds: InventorySeed[] = [
    // Kitchen pantry & fridge
    { name: 'Olive oil', category: 'Pantry', room: 'Kitchen', quantity: 1, minQuantity: 1, price: 9.99, trackingMode: InventoryTrackingMode.LEVEL, status: InventoryItemStatus.LOW, stores: ['Costco'], lastPurchased: -40 },
    { name: 'Coffee beans', category: 'Pantry', room: 'Kitchen', quantity: 1, minQuantity: 2, price: 12.49, stores: ["Trader Joe's"], tags: ['breakfast'], lastPurchased: -18 },
    { name: 'Pasta', category: 'Pantry', room: 'Kitchen', quantity: 5, minQuantity: 2, price: 1.79, stores: ['Kroger'], lastPurchased: -12 },
    { name: 'Rice (jasmine)', category: 'Pantry', room: 'Kitchen', quantity: 1, minQuantity: 1, price: 18.99, trackingMode: InventoryTrackingMode.LEVEL, status: InventoryItemStatus.HALF, stores: ['Costco'] },
    { name: 'Canned black beans', category: 'Pantry', room: 'Kitchen', quantity: 6, minQuantity: 3, price: 0.99, stores: ['Kroger'] },
    { name: 'Peanut butter', category: 'Pantry', room: 'Kitchen', quantity: 1, minQuantity: 1, price: 3.49, trackingMode: InventoryTrackingMode.LEVEL, status: InventoryItemStatus.FULL, stores: ["Trader Joe's"], tags: ['breakfast'] },
    { name: 'Eggs (dozen)', category: 'Dairy', room: 'Kitchen', quantity: 1, minQuantity: 1, price: 3.29, stores: ['Kroger'], expires: 12, tags: ['breakfast'] },
    { name: 'Milk (gallon)', category: 'Dairy', room: 'Kitchen', quantity: 0, minQuantity: 1, price: 3.89, stores: ['Kroger'], expires: -1, tags: ['breakfast'] },
    { name: 'Greek yogurt', category: 'Dairy', room: 'Kitchen', quantity: 4, minQuantity: 2, price: 1.25, stores: ["Trader Joe's"], expires: 9 },
    { name: 'Shredded cheese', category: 'Dairy', room: 'Kitchen', quantity: 1, minQuantity: 1, price: 4.49, stores: ['Kroger'], expires: 18 },
    { name: 'Frozen berries', category: 'Frozen', room: 'Kitchen', quantity: 2, minQuantity: 1, price: 4.99, stores: ["Trader Joe's"] },
    { name: 'Salt', category: 'Spices', room: 'Kitchen', quantity: 1, minQuantity: 0, price: 1.29, trackingMode: InventoryTrackingMode.NONE },

    // Cleaning & household
    { name: 'Dish soap', category: 'Cleaning', room: 'Kitchen', quantity: 1, minQuantity: 1, price: 3.97, trackingMode: InventoryTrackingMode.LEVEL, status: InventoryItemStatus.LOW, stores: ['Target'] },
    { name: 'Dishwasher pods', category: 'Cleaning', room: 'Kitchen', quantity: 45, minQuantity: 15, price: 15.99, stores: ['Costco'], lastPurchased: -20 },
    { name: 'Paper towels', category: 'Household', room: 'Kitchen', quantity: 2, minQuantity: 4, price: 2.49, stores: ['Costco', 'Target'] },
    { name: 'Trash bags (13 gal)', category: 'Household', room: 'Garage', quantity: 1, minQuantity: 1, price: 14.99, stores: ['Costco'], notes: 'Last box — reorder soon.' },
    { name: 'All-purpose cleaner', category: 'Cleaning', room: 'Laundry Room', quantity: 2, minQuantity: 1, price: 4.29, stores: ['Target'] },
    { name: 'Laundry detergent', category: 'Laundry', room: 'Laundry Room', quantity: 1, minQuantity: 1, price: 19.99, trackingMode: InventoryTrackingMode.LEVEL, status: InventoryItemStatus.HALF, stores: ['Costco'] },
    { name: 'Dryer sheets', category: 'Laundry', room: 'Laundry Room', quantity: 1, minQuantity: 1, price: 6.49, stores: ['Target'] },

    // Bathroom
    { name: 'Toilet paper', category: 'Bathroom', room: 'Bathroom', quantity: 12, minQuantity: 6, price: 0.89, stores: ['Costco'], lastPurchased: -9 },
    { name: 'Toothpaste', category: 'Bathroom', room: 'Bathroom', quantity: 1, minQuantity: 2, price: 3.99, stores: ['Target'] },
    { name: 'Hand soap refill', category: 'Bathroom', room: 'Bathroom', quantity: 2, minQuantity: 1, price: 5.49, stores: ['Target'] },
    { name: 'Shampoo', category: 'Bathroom', room: 'Bathroom', quantity: 1, minQuantity: 1, price: 7.99, trackingMode: InventoryTrackingMode.LEVEL, status: InventoryItemStatus.FULL, stores: ['Target'] },

    // Garage & maintenance
    { name: 'HVAC filter 16x25x1', category: 'Maintenance', room: 'Garage', quantity: 1, minQuantity: 2, price: 11.98, stores: ['Home Depot'], notes: 'MERV 11' },
    { name: 'AA batteries', category: 'Household', room: 'Garage', quantity: 16, minQuantity: 8, price: 0.62, stores: ['Costco'] },
    { name: '9V batteries', category: 'Household', room: 'Garage', quantity: 2, minQuantity: 2, price: 3.25, stores: ['Home Depot'], tags: ['smoke detectors'] },
    { name: 'LED light bulbs (A19)', category: 'Household', room: 'Garage', quantity: 6, minQuantity: 4, price: 2.49, stores: ['Home Depot'] },
    { name: 'Windshield washer fluid', category: 'Auto', room: 'Garage', quantity: 1, minQuantity: 1, price: 3.98, stores: ['Home Depot'] },
    { name: 'Fridge water filter (EDR1RXD1)', category: 'Maintenance', room: 'Kitchen', quantity: 1, minQuantity: 1, price: 44.99, stores: ['Amazon'], lastPurchased: -15 },

    // Backyard
    { name: 'Lawn fertilizer', category: 'Garden', room: 'Backyard', quantity: 1, minQuantity: 1, price: 29.97, trackingMode: InventoryTrackingMode.LEVEL, status: InventoryItemStatus.HALF, stores: ['Home Depot'] },
    { name: 'Propane tank', category: 'Garden', room: 'Backyard', quantity: 1, minQuantity: 1, price: 21.99, trackingMode: InventoryTrackingMode.LEVEL, status: InventoryItemStatus.LOW, stores: ['Home Depot'], tags: ['grill'] },
  ];

  const inventory: Record<string, bigint> = {};
  for (const item of inventorySeeds) {
    const created = await prisma.inventory.create({
      data: {
        homeId,
        roomId: rooms[item.room],
        name: item.name,
        description: item.description ?? null,
        category: item.category,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        price: item.price ?? null,
        trackingMode: item.trackingMode ?? InventoryTrackingMode.COUNT,
        status: item.status ?? InventoryItemStatus.FULL,
        stores: item.stores ?? [],
        tags: item.tags ?? [],
        notes: item.notes ?? null,
        lastPurchaseDate: item.lastPurchased === undefined ? null : day(item.lastPurchased),
        expiresDate: item.expires === undefined ? null : day(item.expires),
      },
    });
    inventory[item.name] = created.id;
  }

  // Shopping trips
  await prisma.shoppingTrip.create({
    data: {
      homeId,
      name: 'Costco run',
      description: 'Monthly bulk restock',
      status: ShoppingTripStatus.COMPLETED,
      budget: 250,
      runningTotal: 187.42,
      totalCost: 187.42,
      startDate: at(-9, 16),
      completedDate: at(-9, 17),
      items: {
        create: [
          { rawTranscript: 'toilet paper 30 pack 23.99', name: 'Toilet paper', quantity: 30, price: 23.99, confidence: 0.97, status: ShoppingTripItemStatus.APPLIED, inventoryItemId: inventory['Toilet paper'] },
          { rawTranscript: 'dishwasher pods 15.99', name: 'Dishwasher pods', quantity: 1, price: 15.99, confidence: 0.95, status: ShoppingTripItemStatus.APPLIED, inventoryItemId: inventory['Dishwasher pods'] },
          { rawTranscript: 'AA batteries 48 count 19.99 on sale was 24.99', name: 'AA batteries', quantity: 48, price: 19.99, regularPrice: 24.99, dealType: ShoppingDealType.SALE, confidence: 0.91, status: ShoppingTripItemStatus.APPLIED, inventoryItemId: inventory['AA batteries'] },
          { rawTranscript: 'olive oil two liter 17.49', name: 'Olive oil', quantity: 1, price: 17.49, confidence: 0.93, status: ShoppingTripItemStatus.APPLIED, inventoryItemId: inventory['Olive oil'] },
          { rawTranscript: 'rotisserie chicken 4.99', name: 'Rotisserie chicken', quantity: 1, price: 4.99, confidence: 0.98, status: ShoppingTripItemStatus.CONFIRMED },
          { rawTranscript: 'laundry detergent 19.99', name: 'Laundry detergent', quantity: 1, price: 19.99, confidence: 0.96, status: ShoppingTripItemStatus.APPLIED, inventoryItemId: inventory['Laundry detergent'] },
          { rawTranscript: 'paper towels 12 rolls 24.99', name: 'Paper towels', quantity: 12, price: 24.99, confidence: 0.94, status: ShoppingTripItemStatus.APPLIED, inventoryItemId: inventory['Paper towels'] },
          { rawTranscript: 'frozen berries 3 pound bag 11.49', name: 'Frozen berries', quantity: 1, price: 11.49, confidence: 0.9, status: ShoppingTripItemStatus.APPLIED, inventoryItemId: inventory['Frozen berries'] },
          { rawTranscript: 'jasmine rice 25 lb 18.99', name: 'Rice (jasmine)', quantity: 1, price: 18.99, confidence: 0.92, status: ShoppingTripItemStatus.APPLIED, inventoryItemId: inventory['Rice (jasmine)'] },
          { rawTranscript: 'trash bags 14.99', name: 'Trash bags (13 gal)', quantity: 1, price: 14.99, confidence: 0.95, status: ShoppingTripItemStatus.APPLIED, inventoryItemId: inventory['Trash bags (13 gal)'] },
          { rawTranscript: 'flowers 14.56', name: 'Flowers', quantity: 1, price: 14.56, confidence: 0.88, status: ShoppingTripItemStatus.CONFIRMED },
        ],
      },
    },
  });

  await prisma.shoppingTrip.create({
    data: {
      homeId,
      name: "Weekly groceries — Trader Joe's",
      status: ShoppingTripStatus.ACTIVE,
      budget: 120,
      runningTotal: 38.71,
      startDate: at(0, 17),
      items: {
        create: [
          { rawTranscript: 'two bags of coffee beans 12.49 each', name: 'Coffee beans', quantity: 2, price: 24.98, confidence: 0.94, status: ShoppingTripItemStatus.CONFIRMED, inventoryItemId: inventory['Coffee beans'] },
          { rawTranscript: 'greek yogurt 4 for 5 dollars', name: 'Greek yogurt', quantity: 4, price: 5, regularPrice: 6, dealType: ShoppingDealType.MULTI_BUY, multiBuyQuantity: 4, multiBuyPrice: 5, confidence: 0.86, status: ShoppingTripItemStatus.PARSED, inventoryItemId: inventory['Greek yogurt'] },
          { rawTranscript: 'bananas 1.36', name: 'Bananas', quantity: 6, price: 1.36, confidence: 0.97, status: ShoppingTripItemStatus.CONFIRMED },
          { rawTranscript: 'uh the everything bagel thing 2.99?', name: 'Everything but the Bagel seasoning', quantity: 1, price: 2.99, confidence: 0.58, status: ShoppingTripItemStatus.NEEDS_REVIEW },
          { rawTranscript: 'sourdough loaf 4.38', name: 'Sourdough bread', quantity: 1, price: 4.38, confidence: 0.92, status: ShoppingTripItemStatus.PARSED },
        ],
      },
    },
  });

  await prisma.shoppingTrip.create({
    data: {
      homeId,
      name: 'Home Depot — deck supplies',
      description: 'Everything for the deck refinish',
      status: ShoppingTripStatus.NOT_STARTED,
      budget: 250,
    },
  });

  // Matches what InventoryService builds for low-stock items, so the list reads like the app made it.
  const lowStock = ['Coffee beans', 'Milk (gallon)', 'Paper towels', 'Toothpaste', 'HVAC filter 16x25x1', 'Dish soap', 'Olive oil', 'Propane tank'];
  await prisma.shoppingTrip.create({
    data: {
      homeId,
      name: 'Low Stock Shopping List',
      status: ShoppingTripStatus.NOT_STARTED,
      items: {
        create: lowStock.map((name) => {
          const seed = inventorySeeds.find((i) => i.name === name)!;
          return {
            rawTranscript: name,
            name,
            quantity: Math.max(seed.minQuantity - seed.quantity, 1),
            price: 0,
            status: ShoppingTripItemStatus.PENDING,
            inventoryItemId: inventory[name],
            lowStockInventoryItemId: inventory[name],
          };
        }),
      },
    },
  });

  await prisma.shoppingTrip.create({
    data: {
      homeId,
      name: 'Target errands',
      status: ShoppingTripStatus.COMPLETED,
      budget: 60,
      runningTotal: 41.23,
      totalCost: 41.23,
      startDate: at(-21, 19),
      completedDate: at(-21, 19),
      items: {
        create: [
          { rawTranscript: 'hand soap refill 5.49 times two', name: 'Hand soap refill', quantity: 2, price: 10.98, confidence: 0.93, status: ShoppingTripItemStatus.APPLIED, inventoryItemId: inventory['Hand soap refill'] },
          { rawTranscript: 'shampoo 7.99', name: 'Shampoo', quantity: 1, price: 7.99, confidence: 0.97, status: ShoppingTripItemStatus.APPLIED, inventoryItemId: inventory['Shampoo'] },
          { rawTranscript: 'all purpose cleaner 4.29 two of them', name: 'All-purpose cleaner', quantity: 2, price: 8.58, confidence: 0.9, status: ShoppingTripItemStatus.APPLIED, inventoryItemId: inventory['All-purpose cleaner'] },
          { rawTranscript: 'phone charger 13.68', name: 'Phone charger', quantity: 1, price: 13.68, confidence: 0.95, status: ShoppingTripItemStatus.CONFIRMED },
        ],
      },
    },
  });

  const counts = await Promise.all([
    prisma.room.count({ where: { homeId } }),
    prisma.task.count({ where: { homeId } }),
    prisma.project.count({ where: { homeId } }),
    prisma.inventory.count({ where: { homeId } }),
    prisma.shoppingTrip.count({ where: { homeId } }),
  ]);
  console.log(
    `Seeded ${DEMO_EMAIL} / ${DEMO_PASSWORD}: ${counts[0]} rooms, ${counts[1]} tasks, ${counts[2]} projects, ${counts[3]} inventory items, ${counts[4]} shopping trips`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
