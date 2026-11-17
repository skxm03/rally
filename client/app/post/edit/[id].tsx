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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { postApi } from '../../../src/api/posts';
import { api } from '../../../src/api/client';
import { Post } from '../../../src/types/post';
import { theme } from '../../../src/theme';

export default function EditPostScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = parseInt(id || '', 10);

  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPost() {
      if (Number.isNaN(postId) || postId <= 0) {
        setErrorMessage('Invalid post ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await postApi.getPost(postId);
        setPost(data);
        setTitle(data.title);
        setContent(data.content || '');
        setExistingImageUrl(data.imageUrl);
      } catch (err: any) {
        setErrorMessage(err.message || 'Could not load post details.');
      } finally {
        setIsLoading(false);
      }
    }
    loadPost();
  }, [postId]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewImage(result.assets[0]);
      }
    } catch {
      Alert.alert('Image error', 'Unable to access photo library.');
    }
  };

  const handleRemoveImage = () => {
    setExistingImageUrl(null);
    setNewImage(null);
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3 || cleanTitle.length > 300) {
      setErrorMessage('Title must be between 3 and 300 characters.');
      return;
    }

    const cleanContent = content.trim();
    const hasImage = Boolean(newImage || existingImageUrl);
    if (!cleanContent && !hasImage) {
      setErrorMessage('Post must have either text content or an image.');
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      let finalImageUrl: string | null = existingImageUrl;
      if (newImage) {
        finalImageUrl = await postApi.uploadImage(newImage);
      }

      await postApi.updatePost(postId, {
        title: cleanTitle,
        content: cleanContent || null,
        imageUrl: finalImageUrl,
      });

      router.back();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update post.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color={theme.colors.ink} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Edit Post</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={theme.colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  const resolvedExistingImage = api.getMediaUrl(existingImageUrl);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <View style={styles.leftNav}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            disabled={isSaving}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.ink} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Edit Post</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.primaryContrast} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
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

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Title</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Post title"
              placeholderTextColor={theme.colors.inkSubtle}
              editable={!isSaving}
              maxLength={300}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Content</Text>
            <TextInput
              style={styles.bodyInput}
              value={content}
              onChangeText={(c) => {
                setContent(c);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Text content..."
              placeholderTextColor={theme.colors.inkSubtle}
              multiline
              textAlignVertical="top"
              editable={!isSaving}
            />
          </View>

          {/* Image preview / upload */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Image</Text>
            {newImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: newImage.uri }} style={styles.imagePreview} contentFit="cover" />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                  disabled={isSaving}
                >
                  <Feather name="x" size={16} color={theme.colors.primaryContrast} />
                </TouchableOpacity>
              </View>
            ) : resolvedExistingImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: resolvedExistingImage }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                  disabled={isSaving}
                >
                  <Feather name="x" size={16} color={theme.colors.primaryContrast} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handlePickImage}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Feather name="image" size={18} color={theme.colors.ink} />
                <Text style={styles.addImageText}>Attach photo</Text>
              </TouchableOpacity>
            )}
          </View>
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  leftNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  topBarTitle: {
    ...theme.typography.title,
    fontSize: 16,
    color: theme.colors.ink,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    ...theme.typography.captionMedium,
    color: theme.colors.primaryContrast,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionLabel: {
    ...theme.typography.captionMedium,
    color: theme.colors.inkSecondary,
    marginBottom: 6,
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
