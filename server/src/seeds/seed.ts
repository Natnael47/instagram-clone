import { Types } from "mongoose";
import { connectDB } from "../config/database";
import { Comment, type CommentDocument } from "../models/Comment";
import {
  Conversation,
  type ConversationDocument,
} from "../models/Conversation";
import { Message, type MessageDocument } from "../models/Message";
import {
  Notification,
  type NotificationDocument,
  type NotificationType,
} from "../models/Notification";
import { Post, type PostDocument } from "../models/Post";
import { Story, type StoryDocument } from "../models/Story";
import { User, type UserDocument } from "../models/User";
import { seedComments } from "./data/comments";
import { conversationFlows, messageTemplates } from "./data/messages";
import { seedPosts } from "./data/posts";
import { seedUsers } from "./data/users";
import { CloudinarySeeder } from "./helpers/cloudinarySeeder";
import { RandomGenerator } from "./helpers/randomGenerator";

interface SeedData {
  users: UserDocument[];
  posts: PostDocument[];
  comments: CommentDocument[];
  stories: StoryDocument[];
  conversations: ConversationDocument[];
  messages: MessageDocument[];
  notifications: NotificationDocument[];
}

interface NotificationInput {
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  type: NotificationType;
  entityId: Types.ObjectId;
  message: string;
}

class DatabaseSeeder {
  private data: SeedData = {
    users: [],
    posts: [],
    comments: [],
    stories: [],
    conversations: [],
    messages: [],
    notifications: [],
  };

  /**
   * Main seed function
   */
  async seed(): Promise<void> {
    try {
      console.log("🌱 Starting database seed...\n");

      // Connect to database
      await connectDB();
      console.log("✅ Connected to database\n");

      // Clear existing data
      await this.clearDatabase();
      console.log("🧹 Cleared existing data\n");

      // Seed in order of dependencies
      await this.seedUsers();
      console.log(`✅ Created ${this.data.users.length} users`);

      await this.seedFollowRelationships();
      console.log("✅ Created follow relationships");

      await this.seedPosts();
      console.log(`✅ Created ${this.data.posts.length} posts`);

      await this.seedPostLikes();
      console.log("✅ Added likes to posts");

      await this.seedComments();
      console.log(`✅ Created ${this.data.comments.length} comments`);

      await this.seedStories();
      console.log(`✅ Created ${this.data.stories.length} stories`);

      await this.seedConversations();
      console.log(`✅ Created ${this.data.conversations.length} conversations`);

      await this.seedMessages();
      console.log(`✅ Created ${this.data.messages.length} messages`);

      await this.seedNotifications();
      console.log(`✅ Created ${this.data.notifications.length} notifications`);

      // Update user references
      await this.updateUserReferences();
      console.log("✅ Updated user references\n");

      console.log("🎉 Database seeded successfully!");

      // Print summary
      this.printSummary();

      process.exit(0);
    } catch (error) {
      console.error("❌ Error seeding database:", error);
      process.exit(1);
    }
  }

  /**
   * Clear all collections
   */
  private async clearDatabase(): Promise<void> {
    try {
      await User.deleteMany();
      await Post.deleteMany();
      await Comment.deleteMany();
      await Story.deleteMany();
      await Conversation.deleteMany();
      await Message.deleteMany();
      await Notification.deleteMany();
    } catch (error) {
      console.error("Error clearing database:", error);
      throw error;
    }
  }

  /**
   * Seed users
   */
  private async seedUsers(): Promise<void> {
    const users: UserDocument[] = [];

    for (let i = 0; i < seedUsers.length; i++) {
      const userData = seedUsers[i];

      if (!userData) continue; // Skip if undefined

      const gender: "male" | "female" = i % 2 === 0 ? "female" : "male";

      const user = await User.create({
        username: userData.username,
        email: userData.email,
        password: userData.password, // Will be hashed by pre-save hook
        fullName: userData.fullName,
        bio: userData.bio,
        profilePicture: CloudinarySeeder.getProfilePicture(gender),
      });

      users.push(user);
    }

    this.data.users = users;
  }

  /**
   * Create follow relationships between users
   */
  private async seedFollowRelationships(): Promise<void> {
    const users = this.data.users;

    for (const user of users) {
      // Each user follows 3-7 other random users
      const otherUsers = users.filter(
        (u) => u._id.toString() !== user._id.toString(),
      );
      const usersToFollow = RandomGenerator.getRandomElements(
        otherUsers,
        RandomGenerator.getRandomNumber(3, 7),
      );

      const followerIds = usersToFollow.map((u) => u._id);

      // Update current user's following list
      await User.findByIdAndUpdate(user._id, {
        $addToSet: { following: { $each: followerIds } },
      });

      // Update followed users' followers list
      for (const followedUser of usersToFollow) {
        await User.findByIdAndUpdate(followedUser._id, {
          $addToSet: { followers: user._id },
        });
      }
    }
  }

  /**
   * Seed posts
   */
  private async seedPosts(): Promise<void> {
    const users = this.data.users;
    const posts: PostDocument[] = [];

    for (let i = 0; i < seedPosts.length; i++) {
      const postData = seedPosts[i];

      if (!postData) continue; // Skip if undefined

      const author = users[i % users.length];

      if (!author) continue; // Skip if author is undefined

      const post = await Post.create({
        imageUrl: CloudinarySeeder.getRandomImage(postData.imageCategory),
        caption: postData.caption,
        author: author._id,
        likes: [],
        comments: [],
      });

      posts.push(post);
    }

    this.data.posts = posts;
  }

  /**
   * Add likes to posts
   */
  private async seedPostLikes(): Promise<void> {
    const users = this.data.users;
    const posts = this.data.posts;

    for (const post of posts) {
      const authorId =
        post.author instanceof Types.ObjectId
          ? post.author.toString()
          : (post.author as UserDocument)._id.toString();

      const otherUsers = users.filter((u) => u._id.toString() !== authorId);

      const likes = RandomGenerator.generateLikes(
        otherUsers.map((u) => u._id),
        3,
        8,
      );

      await Post.findByIdAndUpdate(post._id, {
        $addToSet: { likes: { $each: likes } },
      });

      // Create like notifications
      const postAuthorId =
        post.author instanceof Types.ObjectId
          ? post.author
          : (post.author as UserDocument)._id;

      for (const userId of likes) {
        await this.createNotificationIfNotExists({
          recipient: postAuthorId,
          sender: userId,
          type: "like" as NotificationType,
          entityId: post._id,
          message: "liked your post",
        });
      }
    }
  }

  /**
   * Seed comments
   */
  private async seedComments(): Promise<void> {
    const users = this.data.users;
    const posts = this.data.posts;
    const allComments: CommentDocument[] = [];

    for (const post of posts) {
      const authorId =
        post.author instanceof Types.ObjectId
          ? post.author.toString()
          : (post.author as UserDocument)._id.toString();

      const commenters = RandomGenerator.getRandomElements(
        users.filter((u) => u._id.toString() !== authorId),
        RandomGenerator.getRandomNumber(1, 4),
      );

      // Create top-level comments
      for (const commenter of commenters) {
        const commentText = RandomGenerator.getRandomElement(seedComments);

        const comment = await Comment.create({
          text: commentText,
          author: commenter._id,
          post: post._id,
          parentComment: undefined, // Use undefined instead of null for optional field
          likes: [],
        });

        allComments.push(comment);

        // Add some likes to the comment
        const commentLikers = RandomGenerator.getRandomElements(
          users.filter(
            (u) =>
              u._id.toString() !== commenter._id.toString() &&
              u._id.toString() !== authorId,
          ),
          RandomGenerator.getRandomNumber(1, 3),
        );

        if (commentLikers.length > 0) {
          await Comment.findByIdAndUpdate(comment._id, {
            $addToSet: { likes: { $each: commentLikers.map((u) => u._id) } },
          });
        }

        // Add comment to post's embedded comments array
        await Post.findByIdAndUpdate(post._id, {
          $push: {
            comments: {
              user: commenter._id,
              text: commentText,
              createdAt: new Date(),
            },
          },
        });

        // Create comment notification
        const postAuthorId =
          post.author instanceof Types.ObjectId
            ? post.author
            : (post.author as UserDocument)._id;

        await this.createNotificationIfNotExists({
          recipient: postAuthorId,
          sender: commenter._id,
          type: "comment" as NotificationType,
          entityId: comment._id,
          message: `commented on your post: "${commentText.substring(0, 30)}${commentText.length > 30 ? "..." : ""}"`,
        });

        // Sometimes create reply comments
        if (RandomGenerator.getRandomBoolean()) {
          const possibleRepliers = users.filter(
            (u) => u._id.toString() !== commenter._id.toString(),
          );

          if (possibleRepliers.length > 0) {
            const replier = RandomGenerator.getRandomElement(possibleRepliers);
            const replyText = RandomGenerator.getRandomElement(seedComments);

            const reply = await Comment.create({
              text: replyText,
              author: replier._id,
              post: post._id,
              parentComment: comment._id,
              likes: [],
            });

            allComments.push(reply);

            // Add reply to post's embedded comments
            await Post.findByIdAndUpdate(post._id, {
              $push: {
                comments: {
                  user: replier._id,
                  text: replyText,
                  createdAt: new Date(),
                },
              },
            });

            // Create reply notification
            await this.createNotificationIfNotExists({
              recipient: commenter._id,
              sender: replier._id,
              type: "comment" as NotificationType,
              entityId: reply._id,
              message: `replied to your comment: "${replyText.substring(0, 30)}${replyText.length > 30 ? "..." : ""}"`,
            });
          }
        }
      }
    }

    this.data.comments = allComments;
  }

  /**
   * Seed stories
   */
  private async seedStories(): Promise<void> {
    const users = this.data.users;
    const stories: StoryDocument[] = [];

    for (const user of users) {
      // 60% chance of having a story
      if (RandomGenerator.getRandomNumber(1, 100) <= 60) {
        const story = await Story.create({
          imageUrl: CloudinarySeeder.getStoryImage(),
          author: user._id,
          viewers: [],
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        });

        stories.push(story);

        // Add some viewers
        const otherUsers = users.filter(
          (u) => u._id.toString() !== user._id.toString(),
        );
        const viewers = RandomGenerator.getRandomElements(
          otherUsers,
          RandomGenerator.getRandomNumber(2, 6),
        );

        await Story.findByIdAndUpdate(story._id, {
          $addToSet: { viewers: { $each: viewers.map((v) => v._id) } },
        });

        // Create story view notifications
        for (const viewer of viewers) {
          await this.createNotificationIfNotExists({
            recipient: user._id,
            sender: viewer._id,
            type: "story_view" as NotificationType,
            entityId: story._id,
            message: "viewed your story",
          });
        }
      }
    }

    this.data.stories = stories;
  }

  /**
   * Seed conversations
   */
  private async seedConversations(): Promise<void> {
    const users = this.data.users;
    const conversations: ConversationDocument[] = [];
    const usedPairs = new Set<string>();

    // Create 8-12 conversations for more realistic data
    const conversationCount = RandomGenerator.getRandomNumber(8, 12);

    for (let i = 0; i < conversationCount; i++) {
      const [user1, user2] = RandomGenerator.getRandomElements(users, 2);

      if (!user1 || !user2) continue;

      const pairKey = [user1._id.toString(), user2._id.toString()]
        .sort()
        .join("-");

      if (!usedPairs.has(pairKey)) {
        usedPairs.add(pairKey);

        const conversation = await Conversation.create({
          participants: [user1._id, user2._id],
          lastMessage: "Hey! How are you?",
          lastMessageAt: RandomGenerator.getRandomDate(14), // Within last 2 weeks
        });

        conversations.push(conversation);
      }
    }

    this.data.conversations = conversations;
  }

  /**
   * Seed messages
   */
  private async seedMessages(): Promise<void> {
    const conversations = this.data.conversations;
    const allMessages: MessageDocument[] = [];

    for (const conversation of conversations) {
      const participants = conversation.participants;

      // 50% chance of using a predefined conversation flow for more realism
      const useConversationFlow =
        RandomGenerator.getRandomBoolean() && conversationFlows.length > 0;

      if (useConversationFlow) {
        // Use a predefined conversation flow
        const flow = RandomGenerator.getRandomElement(conversationFlows);
        let lastMessage = "";
        let lastMessageAt = new Date();

        for (let i = 0; i < flow.messages.length; i++) {
          const sender = participants[i % participants.length];
          const text = flow.messages[i];

          if (!text) continue; // Skip if text is undefined

          // Each message 1-2 hours apart
          const createdAt = new Date(
            Date.now() -
              (flow.messages.length - i) * 7200000 +
              RandomGenerator.getRandomNumber(0, 3600000),
          );

          const message = await Message.create({
            conversation: conversation._id,
            sender,
            text,
            isRead: true,
            readAt: new Date(),
            isDeleted: false,
            createdAt,
          });

          allMessages.push(message);
          lastMessage = text;
          lastMessageAt = createdAt;
        }

        // Update conversation with last message
        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage,
          lastMessageAt,
        });
      } else {
        // Use random message templates
        const messageCount = RandomGenerator.getRandomNumber(4, 10);
        let lastMessage = "Hey!";
        let lastMessageAt = new Date();

        // Start with a greeting
        const starter =
          messageTemplates.greetings?.length > 0
            ? RandomGenerator.getRandomElement(messageTemplates.greetings)
            : "Hey!";

        const starterMessage = await Message.create({
          conversation: conversation._id,
          sender: participants[0],
          text: starter,
          isRead: true,
          readAt: new Date(),
          isDeleted: false,
          createdAt: RandomGenerator.getRandomDate(7),
        });

        allMessages.push(starterMessage);
        lastMessage = starter;
        lastMessageAt = starterMessage.createdAt;

        // Add more messages with various types
        const messageTypes: Array<keyof typeof messageTemplates> = [
          "responses",
          "questions",
          "plans",
          "compliments",
          "reactions",
          "sharing",
          "support",
          "goodbyes",
        ];

        for (let i = 1; i < messageCount; i++) {
          const sender = participants[i % participants.length];

          // Mix different types of messages
          const messageType = RandomGenerator.getRandomElement(messageTypes);
          const templates = messageTemplates[messageType];

          if (!templates || templates.length === 0) continue;

          const text = RandomGenerator.getRandomElement(templates);

          // Each message 30 mins to 3 hours apart
          const createdAt = new Date(
            starterMessage.createdAt.getTime() +
              i * RandomGenerator.getRandomNumber(1800000, 10800000),
          );

          const message = await Message.create({
            conversation: conversation._id,
            sender,
            text,
            isRead: i < messageCount - 1 || RandomGenerator.getRandomBoolean(),
            readAt: i < messageCount - 1 ? new Date() : undefined,
            isDeleted: false,
            createdAt,
          });

          allMessages.push(message);
          lastMessage = text;
          lastMessageAt = createdAt;
        }

        // Update conversation with last message
        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage,
          lastMessageAt,
        });
      }
    }

    this.data.messages = allMessages;
  }

  /**
   * Seed notifications
   */
  private async seedNotifications(): Promise<void> {
    const users = this.data.users;
    const notifications: NotificationDocument[] = [];

    // Additional notifications beyond likes/comments
    for (const user of users) {
      // Follow notifications
      const otherUsers = users.filter(
        (u) => u._id.toString() !== user._id.toString(),
      );
      const followers = RandomGenerator.getRandomElements(
        otherUsers,
        RandomGenerator.getRandomNumber(1, 3),
      );

      for (const follower of followers) {
        const notification = await this.createNotificationIfNotExists({
          recipient: user._id,
          sender: follower._id,
          type: "follow" as NotificationType,
          entityId: follower._id,
          message: "started following you",
        });

        if (notification) {
          notifications.push(notification);
        }
      }
    }

    this.data.notifications.push(...notifications);
  }

  /**
   * Update user references (posts and stories arrays)
   */
  private async updateUserReferences(): Promise<void> {
    const posts = this.data.posts;
    const stories = this.data.stories;

    // Group posts by author
    const postsByAuthor = new Map<string, Types.ObjectId[]>();
    for (const post of posts) {
      const authorId =
        post.author instanceof Types.ObjectId
          ? post.author.toString()
          : (post.author as UserDocument)._id.toString();

      if (!postsByAuthor.has(authorId)) {
        postsByAuthor.set(authorId, []);
      }
      postsByAuthor.get(authorId)?.push(post._id);
    }

    // Update each user's posts array
    for (const [authorId, postIds] of postsByAuthor) {
      await User.findByIdAndUpdate(authorId, {
        $addToSet: { posts: { $each: postIds } },
      });
    }

    // Group stories by author
    const storiesByAuthor = new Map<string, Types.ObjectId[]>();
    for (const story of stories) {
      const authorId =
        story.author instanceof Types.ObjectId
          ? story.author.toString()
          : (story.author as UserDocument)._id.toString();

      if (!storiesByAuthor.has(authorId)) {
        storiesByAuthor.set(authorId, []);
      }
      storiesByAuthor.get(authorId)?.push(story._id);
    }

    // Update each user's stories array
    for (const [authorId, storyIds] of storiesByAuthor) {
      await User.findByIdAndUpdate(authorId, {
        $addToSet: { stories: { $each: storyIds } },
      });
    }
  }

  /**
   * Helper to create notification if it doesn't exist
   */
  private async createNotificationIfNotExists(
    notificationData: NotificationInput,
  ): Promise<NotificationDocument | null> {
    try {
      // Check if similar notification exists using proper typing
      const existing = await Notification.findOne({
        recipient: notificationData.recipient,
        sender: notificationData.sender,
        type: notificationData.type,
        entityId: notificationData.entityId,
      });

      if (!existing) {
        return await Notification.create(notificationData);
      }

      return null;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  /**
   * Print summary of seeded data
   */
  private printSummary(): void {
    console.log("\n📊 Seed Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`👤 Users:           ${this.data.users.length}`);
    console.log(`📝 Posts:           ${this.data.posts.length}`);
    console.log(`💬 Comments:        ${this.data.comments.length}`);
    console.log(`📖 Stories:         ${this.data.stories.length}`);
    console.log(`💭 Conversations:   ${this.data.conversations.length}`);
    console.log(`✉️  Messages:        ${this.data.messages.length}`);
    console.log(`🔔 Notifications:   ${this.data.notifications.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━\n");
  }
}

// Run seeder
const seeder = new DatabaseSeeder();
seeder.seed();
