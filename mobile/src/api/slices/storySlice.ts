import { baseApi } from "../baseApi";
import type { ApiResponse } from "@/types/api";
import type { Story, StoryGroup } from "@/types/story";

export const storyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFollowedStories: builder.query<ApiResponse<{ stories: StoryGroup[] }>, void>({
      query: () => ({
        url: "/stories",
        method: "GET",
      }),
      providesTags: ["Story"],
    }),

    getMyStories: builder.query<ApiResponse<{ stories: Story[] }>, void>({
      query: () => ({
        url: "/stories/my",
        method: "GET",
      }),
      providesTags: ["Story"],
    }),

    getUserStories: builder.query<ApiResponse<{ stories: Story[] }>, string>({
      query: (userId) => ({
        url: `/stories/user/${userId}`,
        method: "GET",
      }),
      providesTags: ["Story"],
    }),

    createStory: builder.mutation<ApiResponse<{ story: Story }>, FormData>({
      query: (formData) => ({
        url: "/stories",
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
      invalidatesTags: ["Story"],
    }),

    viewStory: builder.mutation<ApiResponse<{ story: Story }>, string>({
      query: (storyId) => ({
        url: `/stories/${storyId}/view`,
        method: "POST",
      }),
    }),

    deleteStory: builder.mutation<ApiResponse<null>, string>({
      query: (storyId) => ({
        url: `/stories/${storyId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Story"],
    }),
  }),
});

export const {
  useGetFollowedStoriesQuery,
  useGetMyStoriesQuery,
  useGetUserStoriesQuery,
  useCreateStoryMutation,
  useViewStoryMutation,
  useDeleteStoryMutation,
} = storyApi;