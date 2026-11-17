import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { postApi } from '../../src/api/posts';
import { communityApi } from '../../src/api/communities';
import { Community } from '../../src/types/community';
import { theme } from '../../src/theme';

export default function CreatePostScreen() {
  const router = useRouter();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCommunities() {
      try {
        setIsLoadingCommunities(true);
        const list = await communityApi.getCommunities();
        setCommunities(list);

        // Pre-select first joined community if available, else first in list
        const firstJoined = list.find((c) => c.isMember);
        if (firstJoined) {
          setSelectedCommunity(firstJoined);
        } else if (list.length > 0) {
          setSelectedCommunity(list[0]);
        }
      } catch {
        setErrorMessage('Failed to load communities.');
      } finally {
        setIsLoadingCommunities(false);
      }
    }
    loadCommunities();
  }, []);

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>New Post</Text>
        <TouchableOpacity
          style={[styles.publishButton, isSubmitting && styles.buttonDisabled]}
          onPress={handlePublish}
          disabled={isSubmitting || isLoadingCommunities}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={theme.colors.primaryContrast} />
          ) : (
            <Text style={styles.publishButtonText}>Publish</Text>
          )}
        </TouchableOpacity>
      </View>

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
            <Text style={styles.sectionLabel}>Community</Text>
            {isLoadingCommunities ? (
              <ActivityIndicator size="small" color={theme.colors.inkSecondary} />
            ) : communities.length === 0 ? (
              <Text style={styles.noCommunityText}>
                No communities found. Please create or explore communities first.
              </Text>
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
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={handlePickImage}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Feather name="image" size={18} color={theme.colors.ink} />
              <Text style={styles.addImageText}>Add photo</Text>
            </TouchableOpacity>
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
  sectionLabel: {
    ...theme.typography.captionMedium,
    color: theme.colors.inkSecondary,
    marginBottom: 6,
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
