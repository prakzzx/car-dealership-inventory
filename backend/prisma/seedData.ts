// Sample inventory. Categories are intentionally distinct words (none is a substring of another)
// because the search endpoint matches categories partially.
export interface SeedVehicle {
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
  year: number;
  description: string;
  imageUrl: string | null;
}

// imageUrl is null: the UI falls back to a built-in placeholder, so the demo works fully offline.
export const SEED_VEHICLES: SeedVehicle[] = [
  { make: 'Toyota', model: 'Camry', category: 'Sedan', price: 28995, quantity: 6, year: 2024, description: 'Comfortable midsize sedan with excellent fuel economy.', imageUrl: null },
  { make: 'Honda', model: 'Civic', category: 'Sedan', price: 24950, quantity: 8, year: 2024, description: 'Sporty compact with a refined interior.', imageUrl: null },
  { make: 'Toyota', model: 'RAV4', category: 'SUV', price: 33450, quantity: 5, year: 2024, description: 'Versatile compact SUV with available all-wheel drive.', imageUrl: null },
  { make: 'Ford', model: 'Explorer', category: 'SUV', price: 42800, quantity: 3, year: 2023, description: 'Three-row family SUV with strong towing capability.', imageUrl: null },
  { make: 'Ford', model: 'F-150', category: 'Truck', price: 46995, quantity: 4, year: 2024, description: 'America\'s workhorse full-size pickup.', imageUrl: null },
  { make: 'Chevrolet', model: 'Silverado 1500', category: 'Truck', price: 45500, quantity: 0, year: 2023, description: 'Capable pickup. Currently sold out - ask us about the next shipment.', imageUrl: null },
  { make: 'Mazda', model: 'MX-5 Miata', category: 'Convertible', price: 29875, quantity: 2, year: 2024, description: 'Lightweight roadster built for driving fun.', imageUrl: null },
  { make: 'Volkswagen', model: 'Golf GTI', category: 'Hatchback', price: 32100, quantity: 4, year: 2023, description: 'The original hot hatch, practical and quick.', imageUrl: null },
  { make: 'Tesla', model: 'Model 3', category: 'Electric', price: 40240, quantity: 7, year: 2024, description: 'All-electric sedan with over 300 miles of range.', imageUrl: null },
  { make: 'Hyundai', model: 'Ioniq 5', category: 'Electric', price: 41650, quantity: 3, year: 2024, description: 'Ultra-fast charging electric crossover.', imageUrl: null },
  { make: 'Chrysler', model: 'Pacifica', category: 'Minivan', price: 40990, quantity: 2, year: 2023, description: 'Family-friendly minivan with stow-and-go seating.', imageUrl: null },
  { make: 'BMW', model: '430i', category: 'Coupe', price: 49600, quantity: 1, year: 2024, description: 'Elegant two-door coupe with a turbocharged inline-four.', imageUrl: null },
];
