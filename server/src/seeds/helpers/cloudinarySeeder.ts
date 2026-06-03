import cloudinary from "../../config/cloudinary";

/**
 * Helper to generate Cloudinary URLs for seed data
 * These are existing sample images hosted on Cloudinary
 */
export class CloudinarySeeder {
  private static readonly SAMPLE_IMAGES = {
    // Nature & Landscapes
    nature: [
      "https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/nature-mountains",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/beach-boat",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/girl-urban",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/landscape-pool",
    ],
    // People & Portraits
    people: [
      "https://res.cloudinary.com/demo/image/upload/v1/samples/people/smiling-man",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/people/kitchen-bar",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/people/bicycle",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/people/boy-snow-hoodie",
    ],
    // Food & Drinks
    food: [
      "https://res.cloudinary.com/demo/image/upload/v1/samples/food/fish-vegetables",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/food/pot-mussels",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/food/dessert",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/food/spices",
    ],
    // Animals
    animals: [
      "https://res.cloudinary.com/demo/image/upload/v1/samples/animals/three-dogs",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/animals/kitten-playing",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/animals/animal-sheep",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/animals/reindeer",
    ],
    // Fashion & Style
    fashion: [
      "https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/analog-classic",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/car-interior-design",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/accessories-bag",
    ],
    // Travel & Places
    travel: [
      "https://res.cloudinary.com/demo/image/upload/v1/samples/travel-changed/city-palace",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/travel-changed/outdoor-woman",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/travel-changed/aircraft-landing",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/travel-changed/lake-sunset",
    ],
  };

  private static readonly PROFILE_PICTURES = {
    male: [
      "https://res.cloudinary.com/demo/image/upload/v1/samples/people/smiling-man",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/people/boy-snow-hoodie",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/people/bicycle",
    ],
    female: [
      "https://res.cloudinary.com/demo/image/upload/v1/samples/people/girl-urban",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/people/kitchen-bar",
      "https://res.cloudinary.com/demo/image/upload/v1/samples/people/outdoor-woman",
    ],
  };

  static getRandomImage(category?: keyof typeof CloudinarySeeder.SAMPLE_IMAGES): string {
    if (category) {
      return RandomGenerator.getRandomElement(CloudinarySeeder.SAMPLE_IMAGES[category]);
    }
    const allCategories = Object.values(CloudinarySeeder.SAMPLE_IMAGES);
    const randomCategory = RandomGenerator.getRandomElement(allCategories);
    return RandomGenerator.getRandomElement(randomCategory);
  }

  static getProfilePicture(gender: "male" | "female"): string {
    return RandomGenerator.getRandomElement(CloudinarySeeder.PROFILE_PICTURES[gender]);
  }

  static getRandomProfilePicture(): string {
    const allProfiles = [
      ...CloudinarySeeder.PROFILE_PICTURES.male,
      ...CloudinarySeeder.PROFILE_PICTURES.female,
    ];
    return RandomGenerator.getRandomElement(allProfiles);
  }

  static getStoryImage(): string {
    return RandomGenerator.getRandomElement([
      ...CloudinarySeeder.SAMPLE_IMAGES.travel,
      ...CloudinarySeeder.SAMPLE_IMAGES.food,
      ...CloudinarySeeder.SAMPLE_IMAGES.nature,
    ]);
  }
}

// Import at top
import { RandomGenerator } from "./randomGenerator";