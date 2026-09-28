// ============================================================
// PAGINATION HELPER
//
// Optional, backward-compatible pagination for list endpoints.
// If neither `page` nor `limit` is present in req.query,
// getPaginationParams() returns null and the endpoint must
// return the plain array exactly as before.
// ============================================================

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

const getPaginationParams = (req) => {
  const { page, limit } = req.query || {};

  if (
    page === undefined &&
    limit === undefined
  ) {
    return null;
  }

  const pageNum = Math.max(
    1,
    parseInt(page, 10) || 1
  );

  const limitNum = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      parseInt(limit, 10) ||
        DEFAULT_LIMIT
    )
  );

  return {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum,
  };
};

const paginatedResponse = (
  res,
  data,
  total,
  { page, limit }
) => {
  const pages = Math.max(
    1,
    Math.ceil(total / limit)
  );

  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  });
};

module.exports = {
  getPaginationParams,
  paginatedResponse,
};
