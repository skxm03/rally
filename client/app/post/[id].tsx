import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { postApi } from '../../src/api/posts';
import { commentApi } from '../../src/api/comments';
import { communityApi } from '../../src/api/communities';
import { api } from '../../src/api/client';
import { Post } from '../../src/types/post';
import { CommentNode } from '../../src/types/comment';
import { CommentItem } from '../../src/components/CommentItem';
import { formatRelativeTime } from '../../src/utils/date';
import { useAuth } from '../../src/context/auth';
import { theme } from '../../src/theme';

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = parseInt(id || '', 10);
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [isCommunityMember, setIsCommunityMember] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommentNode | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isJoiningCommunity, setIsJoiningCommunity] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (Number.isNaN(postId) || postId <= 0) {
      setErrorMessage('Invalid post ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [postData, commentsData] = await Promise.all([
        postApi.getPost(postId),
        commentApi.getComments(postId),
      ]);

      setPost(postData);
      setComments(commentsData);

      // Check viewer's community membership
      if (postData.community?.name) {
        try {
          const comm = await communityApi.getCommunityByName(postData.community.name);
          setIsCommunityMember(comm.isMember);
        } catch {
          setIsCommunityMember(false);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not load post discussion.');
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePostVote = async (targetVote: 1 | -1) => {
    if (!post) return;
    const prevVote = post.userVote;
    const prevScore = post.score;

    let optimisticVote: 1 | -1 | 0 = targetVote;
    let delta = 0;
    if (prevVote === targetVote) {
      optimisticVote = 0;
      delta = -targetVote;
    } else if (prevVote === 0) {
      delta = targetVote;
    } else {
      delta = targetVote * 2;
    }

    setPost((prev) =>
      prev ? { ...prev, userVote: optimisticVote, score: prevScore + delta } : prev
    );

    try {
      const res = await postApi.votePost(post.id, targetVote);
      setPost((prev) =>
        prev ? { ...prev, userVote: res.voteValue, score: res.score } : prev
      );
    } catch (err: any) {
      setPost((prev) =>
        prev ? { ...prev, userVote: prevVote, score: prevScore } : prev
      );
      if (err.status === 401) {
        Alert.alert('Sign in required', 'Please sign in to vote.');
      }
    }
  };

  const handleJoinCommunity = async () => {
    if (!post) return;
    setIsJoiningCommunity(true);
    try {
      await communityApi.joinCommunity(post.communityId);
      setIsCommunityMember(true);
    } catch (err: any) {
      Alert.alert('Join error', err.message || 'Could not join community.');
    } finally {
      setIsJoiningCommunity(false);
    }
  };

  const handleSendComment = async () => {
    const cleanContent = commentText.trim();
    if (!cleanContent) return;

    if (!isCommunityMember) {
      Alert.alert(
        'Membership required',
        'You must join this community before participating in discussions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Join now', onPress: handleJoinCommunity },
        ]
      );
      return;
    }

    setIsSubmittingComment(true);
    try {
      await commentApi.createComment(postId, {
        parentCommentId: replyingTo ? replyingTo.id : null,
        content: cleanContent,
      });

      setCommentText('');
      setReplyingTo(null);

      // Refresh comment tree
      const updatedComments = await commentApi.getComments(postId);
      setComments(updatedComments);
    } catch (err: any) {
      Alert.alert('Comment failed', err.message || 'Unable to post comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const updateCommentInTree = (
    list: CommentNode[],
    commentId: number,
    modifier: (node: CommentNode) => CommentNode | null
  ): CommentNode[] => {
    return list
      .map((node) => {
        if (node.id === commentId) {
          return modifier(node);
        }
        if (node.replies && node.replies.length > 0) {
          return {
            ...node,
            replies: updateCommentInTree(node.replies, commentId, modifier),
          };
        }
        return node;
      })
      .filter((n): n is CommentNode => n !== null);
  };

  const handleCommentUpdated = (updated: CommentNode) => {
    setComments((prev) =>
      updateCommentInTree(prev, updated.id, (node) => ({ ...node, content: updated.content }))
    );
  };

  const handleCommentDeleted = (deletedId: number, isTombstone: boolean) => {
    setComments((prev) =>
      updateCommentInTree(prev, deletedId, (node) => {
        if (isTombstone) {
          return {
            ...node,
            content: '[deleted]',
            author: { id: null, username: '[deleted]', displayName: '[deleted]' },
          };
        }
        return null;
      })
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color={theme.colors.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={theme.colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color={theme.colors.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Post Unavailable</Text>
          <Text style={styles.errorSubtitle}>{errorMessage || 'Post not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const resolvedImageUrl = api.getMediaUrl(post.imageUrl);
  const communityName = post.community?.name || 'community';
  const authorName = post.author?.displayName || post.author?.username || 'anonymous';
  const relativeTime = formatRelativeTime(post.createdAt);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={theme.colors.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push(`/community/${communityName}`)}
          style={styles.communityNav}
        >
          <Text style={styles.topNavTitle}>c/{communityName}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Post Header */}
          <View style={styles.postBlock}>
            <View style={styles.metaRow}>
              <TouchableOpacity onPress={() => router.push(`/community/${communityName}`)}>
                <Text style={styles.communityName}>c/{communityName}</Text>
              </TouchableOpacity>
              <Text style={styles.metaDivider}>·</Text>
              <Text style={styles.authorName}>u/{authorName}</Text>
              {relativeTime ? (
                <>
                  <Text style={styles.metaDivider}>·</Text>
                  <Text style={styles.timeText}>{relativeTime}</Text>
                </>
              ) : null}
            </View>

            <Text style={styles.postTitle}>{post.title}</Text>

            {post.content ? <Text style={styles.postBody}>{post.content}</Text> : null}

            {resolvedImageUrl ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: resolvedImageUrl }}
                  style={styles.postImage}
                  contentFit="contain"
                />
              </View>
            ) : null}

            {/* Post Vote and Metrics Bar */}
            <View style={styles.postActionsRow}>
              <View style={styles.voteContainer}>
                <TouchableOpacity
                  style={styles.voteButton}
                  onPress={() => handlePostVote(1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather
                    name="arrow-up"
                    size={17}
                    color={post.userVote === 1 ? theme.colors.ink : theme.colors.inkSubtle}
                  />
                </TouchableOpacity>

                <Text
                  style={[
                    styles.scoreText,
                    post.userVote === 1 && styles.scorePositive,
                    post.userVote === -1 && styles.scoreNegative,
                  ]}
                >
                  {post.score}
                </Text>

                <TouchableOpacity
                  style={styles.voteButton}
                  onPress={() => handlePostVote(-1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather
                    name="arrow-down"
                    size={17}
                    color={post.userVote === -1 ? theme.colors.error : theme.colors.inkSubtle}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.commentCountBox}>
                <Feather name="message-square" size={15} color={theme.colors.inkSubtle} />
                <Text style={styles.commentCountText}>
                  {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                </Text>
              </View>
            </View>
          </View>

          {/* Join Community Prompt if viewer is not a member */}
          {!isCommunityMember && (
            <View style={styles.membershipBanner}>
              <View style={styles.membershipBannerTextCol}>
                <Text style={styles.membershipBannerTitle}>Join c/{communityName}</Text>
                <Text style={styles.membershipBannerSub}>
                  Join this community to leave comments and reply to discussions.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.joinBannerButton}
                onPress={handleJoinCommunity}
                disabled={isJoiningCommunity}
                activeOpacity={0.8}
              >
                {isJoiningCommunity ? (
                  <ActivityIndicator size="small" color={theme.colors.primaryContrast} />
                ) : (
                  <Text style={styles.joinBannerButtonText}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Discussion Thread */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionHeading}>Discussion</Text>

            {comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>
                  No comments yet. Be the first to start the conversation!
                </Text>
              </View>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  depth={0}
                  onReply={(target) => setReplyingTo(target)}
                  onCommentUpdated={handleCommentUpdated}
                  onCommentDeleted={handleCommentDeleted}
                />
              ))
            )}
          </View>
        </ScrollView>

        {/* Docked Comment Input Bar */}
        <View style={styles.inputBar}>
          {replyingTo && (
            <View style={styles.replyingBar}>
              <Text style={styles.replyingText}>
                Replying to u/
                {replyingTo.author?.displayName || replyingTo.author?.username || 'user'}
              </Text>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Feather name="x" size={14} color={theme.colors.inkSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
              placeholderTextColor={theme.colors.inkSubtle}
              multiline
              maxLength={2000}
              editable={!isSubmittingComment}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!commentText.trim() || isSubmittingComment) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendComment}
              disabled={!commentText.trim() || isSubmittingComment}
              activeOpacity={0.8}
            >
              {isSubmittingComment ? (
                <ActivityIndicator size="small" color={theme.colors.primaryContrast} />
              ) : (
                <Feather name="send" size={16} color={theme.colors.primaryContrast} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  communityNav: {
    paddingVertical: 2,
  },
  topNavTitle: {
    ...theme.typography.title,
    fontSize: 16,
    color: theme.colors.ink,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  postBlock: {
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  communityName: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
  },
  metaDivider: {
    ...theme.typography.caption,
    color: theme.colors.inkSubtle,
    marginHorizontal: 5,
  },
  authorName: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.inkSubtle,
  },
  postTitle: {
    ...theme.typography.hero,
    fontSize: 22,
    color: theme.colors.ink,
    marginBottom: 8,
  },
  postBody: {
    ...theme.typography.body,
    color: theme.colors.ink,
    lineHeight: 24,
    marginBottom: theme.spacing.md,
  },
  imageContainer: {
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.lg,
    maxHeight: 380,
  },
  postImage: {
    width: '100%',
    height: 300,
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xl,
    marginTop: 6,
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
  },
  voteButton: {
    padding: 3,
  },
  scoreText: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
    minWidth: 18,
    textAlign: 'center',
  },
  scorePositive: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
  scoreNegative: {
    color: theme.colors.error,
    fontWeight: '700',
  },
  commentCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentCountText: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  membershipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  membershipBannerTextCol: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  membershipBannerTitle: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
    marginBottom: 2,
  },
  membershipBannerSub: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.inkSecondary,
  },
  joinBannerButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  joinBannerButtonText: {
    ...theme.typography.captionMedium,
    color: theme.colors.primaryContrast,
  },
  commentsSection: {
    padding: theme.spacing.xl,
  },
  sectionHeading: {
    ...theme.typography.title,
    fontSize: 16,
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  emptyComments: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyCommentsText: {
    ...theme.typography.body,
    color: theme.colors.inkSecondary,
    textAlign: 'center',
  },
  inputBar: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  replyingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  replyingText: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.ink,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  errorTitle: {
    ...theme.typography.title,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  errorSubtitle: {
    ...theme.typography.body,
    color: theme.colors.inkSecondary,
    textAlign: 'center',
  },
});
