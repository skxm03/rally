import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CommentNode } from '../types/comment';
import { commentApi } from '../api/comments';
import { formatRelativeTime } from '../utils/date';
import { useAuth } from '../context/auth';
import { Button } from './Button';
import { theme } from '../theme';

interface CommentItemProps {
  comment: CommentNode;
  depth?: number;
  onReply: (comment: CommentNode) => void;
  onCommentUpdated?: (updated: CommentNode) => void;
  onCommentDeleted?: (commentId: number, isTombstone: boolean) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth = 0,
  onReply,
  onCommentUpdated,
  onCommentDeleted,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const isDeleted = comment.content === '[deleted]';
  const isAuthor = Boolean(user && user.id === comment.authorId && !isDeleted);

  const [currentScore, setCurrentScore] = useState(comment.score);
  const [currentUserVote, setCurrentUserVote] = useState(comment.userVote);
  const [isVoting, setIsVoting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  React.useEffect(() => {
    setCurrentScore(comment.score);
    setCurrentUserVote(comment.userVote);
  }, [comment.score, comment.userVote]);

  const handleVote = async (targetVote: 1 | -1) => {
    if (isVoting || isDeleted) return;

    const previousScore = currentScore;
    const previousVote = currentUserVote;

    let optimisticVote: 1 | -1 | 0 = targetVote;
    let delta = 0;

    if (previousVote === targetVote) {
      optimisticVote = 0;
      delta = -targetVote;
    } else if (previousVote === 0) {
      delta = targetVote;
    } else {
      delta = targetVote * 2;
    }

    setCurrentScore(previousScore + delta);
    setCurrentUserVote(optimisticVote);
    setIsVoting(true);

    try {
      const response = await commentApi.voteComment(comment.id, targetVote);
      setCurrentScore(response.score);
      setCurrentUserVote(response.voteValue);
    } catch (err: any) {
      setCurrentScore(previousScore);
      setCurrentUserVote(previousVote);
      if (err.status === 401) {
        Alert.alert('Sign in required', 'Please sign in to vote on comments.');
      } else {
        Alert.alert('Vote failed', err.message || 'Could not record vote.');
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleSaveEdit = async () => {
    const cleanContent = editContent.trim();
    if (!cleanContent) {
      Alert.alert('Empty comment', 'Comment cannot be blank.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const updated = await commentApi.updateComment(comment.id, { content: cleanContent });
      setIsEditing(false);
      onCommentUpdated?.(updated);
    } catch (err: any) {
      Alert.alert('Update failed', err.message || 'Could not update comment.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await commentApi.deleteComment(comment.id);
            onCommentDeleted?.(comment.id, res.isTombstone);
          } catch (err: any) {
            Alert.alert('Delete failed', err.message || 'Could not delete comment.');
          }
        },
      },
    ]);
  };

  const authorName = comment.author?.displayName || comment.author?.username || 'anonymous';
  const relativeTime = formatRelativeTime(comment.createdAt);
  const clampedDepth = Math.min(depth, 4);

  return (
    <View
      style={[
        styles.container,
        depth > 0 && {
          marginLeft: clampedDepth * 12,
          borderLeftWidth: 1.5,
          borderLeftColor: theme.colors.border,
          paddingLeft: theme.spacing.md,
        },
      ]}
    >
      {/* Header: Author + Time */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => {
            if (!isDeleted && comment.author?.username) {
              router.push(`/user/${comment.author.username}`);
            }
          }}
          disabled={isDeleted}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[styles.authorName, isDeleted && styles.deletedAuthor]}>
            {isDeleted ? '[deleted]' : `u/${authorName}`}
          </Text>
        </TouchableOpacity>
        {relativeTime && !isDeleted ? (
          <>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.timeText}>{relativeTime}</Text>
          </>
        ) : null}
      </View>

      {/* Body / Edit View */}
      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            autoFocus
            editable={!isSavingEdit}
          />
          <View style={styles.editActions}>
            <Button
              title="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => {
                setEditContent(comment.content);
                setIsEditing(false);
              }}
              disabled={isSavingEdit}
            />
            <Button
              title="Save"
              size="sm"
              loading={isSavingEdit}
              onPress={handleSaveEdit}
            />
          </View>
        </View>
      ) : (
        <Text style={[styles.content, isDeleted && styles.deletedContent]}>
          {comment.content}
        </Text>
      )}

      {/* Action Row: Vote, Reply, Edit, Delete */}
      {!isDeleted && !isEditing && (
        <View style={styles.actionsRow}>
          <View style={styles.voteBox}>
            <TouchableOpacity
              style={styles.voteBtn}
              onPress={() => handleVote(1)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Feather
                name="arrow-up"
                size={14}
                color={currentUserVote === 1 ? theme.colors.ink : theme.colors.inkSubtle}
              />
            </TouchableOpacity>

            <Text
              style={[
                styles.scoreText,
                currentUserVote === 1 && styles.scorePositive,
                currentUserVote === -1 && styles.scoreNegative,
              ]}
            >
              {currentScore}
            </Text>

            <TouchableOpacity
              style={styles.voteBtn}
              onPress={() => handleVote(-1)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Feather
                name="arrow-down"
                size={14}
                color={currentUserVote === -1 ? theme.colors.error : theme.colors.inkSubtle}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => onReply(comment)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="corner-down-right" size={13} color={theme.colors.inkSecondary} />
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>

          {isAuthor && (
            <View style={styles.authorActions}>
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Feather name="edit-2" size={13} color={theme.colors.inkSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Feather name="trash-2" size={13} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Recursive Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesList}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorName: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
  },
  deletedAuthor: {
    color: theme.colors.inkSubtle,
    fontStyle: 'italic',
  },
  dot: {
    ...theme.typography.caption,
    color: theme.colors.inkSubtle,
    marginHorizontal: 5,
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.inkSubtle,
  },
  content: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.ink,
    lineHeight: 20,
    marginBottom: 6,
  },
  deletedContent: {
    color: theme.colors.inkSubtle,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  voteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 3,
  },
  voteBtn: {
    padding: 2,
  },
  scoreText: {
    ...theme.typography.captionMedium,
    fontSize: 12,
    color: theme.colors.ink,
    minWidth: 14,
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
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyText: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  authorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginLeft: 'auto',
  },
  editContainer: {
    marginBottom: theme.spacing.sm,
  },
  editInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.ink,
    minHeight: 60,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: 6,
  },
  cancelEditButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  cancelEditText: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  saveEditButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  saveEditText: {
    ...theme.typography.captionMedium,
    color: theme.colors.primaryContrast,
  },
  repliesList: {
    marginTop: theme.spacing.xs,
  },
});
