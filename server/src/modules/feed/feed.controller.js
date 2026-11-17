import * as feedService from './feed.service.js';

export const getFeed = async (req, res, next) => {
  try {
    const { type, sort, page, limit } = req.query;
    let result;
    if (type === 'popular') {
      result = await feedService.getPopularFeed({
        userId: req.user?.id,
        sort,
        page,
        limit,
      });
    } else {
      result = await feedService.getHomeFeed({
        userId: req.user?.id,
        sort,
        page,
        limit,
      });
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getPopular = async (req, res, next) => {
  try {
    const { sort, page, limit } = req.query;
    const result = await feedService.getPopularFeed({
      userId: req.user?.id,
      sort,
      page,
      limit,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getCommunityPosts = async (req, res, next) => {
  try {
    const { name } = req.params;
    const { sort, page, limit } = req.query;
    const result = await feedService.getCommunityPosts({
      communityName: name,
      userId: req.user?.id,
      sort,
      page,
      limit,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
