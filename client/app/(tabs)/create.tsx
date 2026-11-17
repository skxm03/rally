import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { postApi } from '../../src/api/posts';
import { communityApi } from '../../src/api/communities';
import { Button } from '../../src/components/Button';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Community } from '../../src/types/community';
import { theme } from '../../src/theme';

export default function CreatePostScreen() {
  const router = useRouter();
  const { communityId, communityName } = useLocalSearchParams<{
    communityId?: string;
    communityName?: string;
  }>();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCommunities = useCallback(async () => {
    try {
      setIsLoadingCommunities(true);
      const list = await communityApi.getCommunities();
      setCommunities(list);

      // 1. If explicit communityId or communityName query param is provided, select it
      if (communityId || communityName) {
        const matching = list.find(
          (c) =>
            (communityId && String(c.id) === String(communityId)) ||
            (communityName && c.name.toLowerCase() === communityName.toLowerCase())
        );
        if (matching) {
          setSelectedCommunity(matching);
          return;
        }
      }

      // 2. Otherwise retain currently selected community if still in the list, else default
      setSelectedCommunity((prev) => {
        if (prev) {
          const stillThere = list.find((c) => c.id === prev.id);
          if (stillThere) return stillThere;
        }
        const firstJoined = list.find((c) => c.isMember);
        return firstJoined || (list.length > 0 ? list[0] : null);
      });
    } catch {
      setErrorMessage('Failed to load communities.');
    } finally {
      setIsLoadingCommunities(false);
    }
  }, [communityId, communityName]);

  // Re-fetch communities whenever this screen gains focus (e.g. after returning from Community Creation)
  useFocusEffect(
    useCallback(() => {
      loadCommunities();
    }, [loadCommunities])
  );

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch {
      Alert.alert('Image error', 'Unable to access photo library.');
    }
  };

  const handleJoinSelected = async () => {
    if (!selectedCommunity) return;
    try {
      await communityApi.joinCommunity(selectedCommunity.id);
      setSelectedCommunity((prev) => (prev ? { ...prev, isMember: true } : prev));
      setCommunities((prev) =>
        prev.map((c) => (c.id === selectedCommunity.id ? { ...c, isMember: true } : c))
      );
    } catch (err: any) {
      Alert.alert('Join error', err.message || 'Could not join community.');
    }
  };

  const handlePublish = async () => {
    if (!selectedCommunity) {
      setErrorMessage('Please select a community for this post.');
      return;
    }

    if (!selectedCommunity.isMember) {
      setErrorMessage('You must join this community before posting.');
      return;
    }

    const cleanTitle = title.trim();
    if (cleanTitle.length < 3 || cleanTitle.length > 300) {
      setErrorMessage('Title must be between 3 and 300 characters.');
      return;
    }

    const cleanContent = content.trim();
    if (!cleanContent && !selectedImage) {
      setErrorMessage('A post must include either text content or an image.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      let uploadedImageUrl: string | null = null;
      if (selectedImage) {
        setStatusMessage('Uploading image...');
        uploadedImageUrl = await postApi.uploadImage(selectedImage);
      }

      setStatusMessage('Publishing post...');
      await postApi.createPost({
        communityId: selectedCommunity.id,
        title: cleanTitle,
        content: cleanContent || null,
        imageUrl: uploadedImageUrl,
      });

      // Clear form
      setTitle('');
      setContent('');
      setSelectedImage(null);

      // Navigate to community feed
      router.push(`/community/${selectedCommunity.name}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to publish post.');
    } finally {
      setIsSubmitting(false);
      setStatusMessage(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <ScreenHeader
        title="New Post"
        rightAction={
          <Button
            title="Publish"
            size="sm"
            loading={isSubmitting}
            disabled={isLoadingCommunities}
            onPress={handlePublish}
          />
        }
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {statusMessage && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color={theme.colors.ink} style={{ marginRight: 8 }} />
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}

          {/* Community Selector */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Community</Text>
              {communities.length > 0 && (
                <TouchableOpacity
                  onPress={() => router.push('/community/create')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.newCommunityLink}>+ New</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoadingCommunities ? (
              <ActivityIndicator size="small" color={theme.colors.inkSecondary} />
            ) : communities.length === 0 ? (
              <View style={styles.emptyCommunitiesContainer}>
                <Text style={styles.noCommunityText}>
                  No communities found. Create one or refresh to start posting.
                </Text>
                <View style={styles.emptyActionsRow}>
                  <Button
                    title="Create Community"
                    size="sm"
                    icon={<Feather name="plus" size={14} color={theme.colors.primaryContrast} />}
                    onPress={() => router.push('/community/create')}
                  />

                  <Button
                    title="Refresh"
                    variant="secondary"
                    size="sm"
                    icon={<Feather name="refresh-cw" size={14} color={theme.colors.ink} />}
                    onPress={loadCommunities}
                  />
                </View>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.communityScroll}
              >
                {communities.map((comm) => {
                  const isSelected = selectedCommunity?.id === comm.id;
                  return (
                    <TouchableOpacity
                      key={comm.id}
                      style={[
                        styles.communityChip,
                        isSelected && styles.communityChipSelected,
                      ]}
                      onPress={() => setSelectedCommunity(comm)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.communityChipText,
                          isSelected && styles.communityChipTextSelected,
                        ]}
                      >
                        c/{comm.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Non-member alert inside community selector */}
            {selectedCommunity && !selectedCommunity.isMember && (
              <View style={styles.joinPrompt}>
                <Text style={styles.joinPromptText}>
                  You are not a member of c/{selectedCommunity.name}.
                </Text>
                <TouchableOpacity onPress={handleJoinSelected} style={styles.joinPromptButton}>
                  <Text style={styles.joinPromptButtonText}>Join now</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Title Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Title</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="What's on your mind?"
              placeholderTextColor={theme.colors.inkSubtle}
              editable={!isSubmitting}
              maxLength={300}
            />
          </View>

          {/* Body Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Body (optional)</Text>
            <TextInput
              style={styles.bodyInput}
              value={content}
              onChangeText={(c) => {
                setContent(c);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Share context, details, or questions..."
              placeholderTextColor={theme.colors.inkSubtle}
              multiline
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>

          {/* Attached Image Preview */}
          {selectedImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.imagePreview}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Feather name="x" size={16} color={theme.colors.primaryContrast} />
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              title="Add photo"
              variant="secondary"
              size="md"
              icon={<Feather name="image" size={16} color={theme.colors.ink} />}
              onPress={handlePickImage}
              disabled={isSubmitting}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  topBarTitle: {
    ...theme.typography.title,
    color: theme.colors.ink,
  },
  publishButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonText: {
    ...theme.typography.captionMedium,
    color: theme.colors.primaryContrast,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.hero,
  },
  errorBox: {
    backgroundColor: theme.colors.errorBackground,
    borderColor: theme.colors.errorBorder,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statusText: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionLabel: {
    ...theme.typography.captionMedium,
    color: theme.colors.inkSecondary,
  },
  newCommunityLink: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
    textDecorationLine: 'underline',
  },
  emptyCommunitiesContainer: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  emptyCreateButtonText: {
    ...theme.typography.captionMedium,
    color: theme.colors.primaryContrast,
  },
  emptyRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  emptyRefreshButtonText: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
  },
  communityScroll: {
    gap: theme.spacing.sm,
    paddingVertical: 2,
  },
  communityChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  communityChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  communityChipText: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
  },
  communityChipTextSelected: {
    color: theme.colors.primaryContrast,
  },
  noCommunityText: {
    ...theme.typography.caption,
    color: theme.colors.inkSubtle,
  },
  joinPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: theme.spacing.sm,
  },
  joinPromptText: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  joinPromptButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  joinPromptButtonText: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
    textDecorationLine: 'underline',
  },
  titleInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.ink,
  },
  bodyInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.ink,
    minHeight: 120,
    lineHeight: 22,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    height: 200,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addImageText: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
  },
});
