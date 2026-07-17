using Lucene.Net.Analysis;
using Lucene.Net.Analysis.Core;
using Lucene.Net.Analysis.Snowball;
using Lucene.Net.Analysis.Standard;
using Lucene.Net.Util;

namespace PhaenoPortal.App.Features.Website.Search.Support;

public sealed class StemmingAnalyzer : Analyzer
{
    private static readonly LuceneVersion MatchVersion = LuceneVersion.LUCENE_48;

    protected override TokenStreamComponents CreateComponents(
        string fieldName,
        TextReader reader)
    {
        var tokenizer = new StandardTokenizer(MatchVersion, reader);
        TokenStream tokenStream = new StandardFilter(MatchVersion, tokenizer);
        tokenStream = new LowerCaseFilter(MatchVersion, tokenStream);
        tokenStream = new SnowballFilter(tokenStream, "English");
        return new TokenStreamComponents(tokenizer, tokenStream);
    }
}
