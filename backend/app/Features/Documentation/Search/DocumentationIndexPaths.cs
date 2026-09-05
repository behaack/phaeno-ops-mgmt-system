namespace PhaenoPortal.App.Features.Documentation.Search;

public static class DocumentationIndexPaths
{
    public static string Resolve(string root, string path) => Path.GetFullPath(path, root);

    public static string Canonical(string path)
    {
        var full = Path.GetFullPath(path);
        var root = Path.GetPathRoot(full)!;
        var result = root;
        foreach (var part in full[root.Length..].Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar))
        {
            if (part.Length == 0) continue;
            result = Path.Combine(result, part);
            var info = new DirectoryInfo(result);
            if (info.Exists && info.LinkTarget is not null)
                result = info.ResolveLinkTarget(true)?.FullName
                    ?? throw new IOException("Cannot resolve documentation index path.");
        }
        return Path.TrimEndingDirectorySeparator(result);
    }

    public static void Validate(string documentationRoot, IEnumerable<string> websiteRoots)
    {
        var root = Canonical(documentationRoot);
        if (Path.GetPathRoot(root) == root) throw new IOException("An index cannot use a filesystem root.");
        var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        foreach (var other in websiteRoots.Select(Canonical))
            if (root.Equals(other, comparison)
                || root.StartsWith(other + Path.DirectorySeparatorChar, comparison)
                || other.StartsWith(root + Path.DirectorySeparatorChar, comparison))
                throw new IOException("Documentation and Website index paths must be disjoint.");
    }
}
