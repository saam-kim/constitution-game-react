const githubPagesPath = "/constitution-game-react/";

const isGitHubPagesHost = () =>
  typeof window !== "undefined" &&
  window.location.hostname.endsWith("github.io");

const getBasePath = () => {
  if (isGitHubPagesHost()) {
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

  if (isGitHubPagesHost()) {
    return queryString ? `${normalizedBase}#/?${queryString}` : normalizedBase;
  }

  return queryString ? `${normalizedBase}?${queryString}` : normalizedBase;
};

export const getAppUrl = (params = {}) => {
  if (typeof window === "undefined") return getAppPath(params);
  return `${window.location.origin}${getAppPath(params)}`;
};

export const getRouteParams = () => {
  if (typeof window === "undefined") return new URLSearchParams();

  const hash = window.location.hash || "";
  const hashQueryIndex = hash.indexOf("?");

  if (hashQueryIndex >= 0) {
    return new URLSearchParams(hash.slice(hashQueryIndex + 1));
  }

  return new URLSearchParams(window.location.search);
};
