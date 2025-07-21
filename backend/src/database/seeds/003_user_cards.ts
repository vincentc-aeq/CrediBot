import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex("user_cards").del();

  // Insert seed data
  await knex("user_cards").insert([
    {
      id: "550e8400-e29b-41d4-a716-446655440201",
      user_id: "550e8400-e29b-41d4-a716-446655440101", // John Doe
      card_id: "550e8400-e29b-41d4-a716-446655440002", // Citi Double Cash
      card_nickname: "My Daily Driver",
      date_obtained: new Date("2023-01-15"),
      is_primary: true,
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440202",
      user_id: "550e8400-e29b-41d4-a716-446655440101", // John Doe
      card_id: "550e8400-e29b-41d4-a716-446655440001", // Chase Sapphire Preferred
      card_nickname: "Travel Card",
      date_obtained: new Date("2023-06-20"),
      is_primary: false,
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440203",
      user_id: "550e8400-e29b-41d4-a716-446655440102", // Jane Smith
      card_id: "550e8400-e29b-41d4-a716-446655440004", // Discover it Cash Back
      card_nickname: null,
      date_obtained: new Date("2022-11-10"),
      is_primary: true,
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440204",
      user_id: "550e8400-e29b-41d4-a716-446655440103", // Mike Wilson
      card_id: "550e8400-e29b-41d4-a716-446655440003", // American Express Gold
      card_nickname: "Business Dining",
      date_obtained: new Date("2023-03-05"),
      is_primary: true,
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440205",
      user_id: "550e8400-e29b-41d4-a716-446655440103", // Mike Wilson
      card_id: "550e8400-e29b-41d4-a716-446655440005", // Capital One Venture
      card_nickname: "Travel Miles",
      date_obtained: new Date("2023-08-12"),
      is_primary: false,
      is_active: true,
    },
  ]);
}
