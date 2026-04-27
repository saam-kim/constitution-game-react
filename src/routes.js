const githubPagesPath = "/constitution-game-react/";

const getBasePath = () => {
  if (
    typeof window !== "undefined" &&
    window.location.hostname.endsWith("github.io")
  ) {
    return githubPagesPath;
  }

  return import.meta.env.BASE_URL || "/";
};

export const getAppPath = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const basePath = getBasePath();
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  const queryString = query.toString();
  return queryString ? `${normalizedBase}?${queryString}` : normalizedBase;
};

export const getAppUrl = (params = {}) => {
  if (typeof window === "undefined") return getAppPath(params);
  return `${window.location.origin}${getAppPath(params)}`;
};
