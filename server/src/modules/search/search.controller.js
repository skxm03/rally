import * as searchService from './search.service.js';

export const search = async (req, res, next) => {
  try {
    const { q, type, page, limit } = req.query;
    const result = await searchService.search({
      q,
      type,
      userId: req.user?.id,
      page,
      limit,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
