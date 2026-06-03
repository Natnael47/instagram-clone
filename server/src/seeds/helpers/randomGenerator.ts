import type { Types } from "mongoose";

export class RandomGenerator {
  /**
   * Get random element from array
   */
  static getRandomElement<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot get random element from empty array");
    }
    return array[Math.floor(Math.random() * array.length)] as T;
  }

  /**
   * Get multiple random elements from array
   */
  static getRandomElements<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  }

  /**
   * Get random number between min and max
   */
  static getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random date within the last N days
   */
  static getRandomDate(daysBack: number = 30): Date {
    const now = new Date();
    const pastDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    return new Date(
      pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime()),
    );
  }

  /**
   * Generate a random subset of users who liked a post
   */
  static generateLikes(
    users: Types.ObjectId[],
    minLikes: number = 5,
    maxLikes: number = 50,
  ): Types.ObjectId[] {
    const likeCount = this.getRandomNumber(minLikes, maxLikes);
    return this.getRandomElements(users, likeCount);
  }

  /**
   * Generate random boolean
   */
  static getRandomBoolean(): boolean {
    return Math.random() > 0.5;
  }
}
