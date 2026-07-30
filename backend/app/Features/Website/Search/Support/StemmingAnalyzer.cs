using Lucene.Net.Analysis;
using Lucene.Net.Analysis.Core;
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
        // WebsiteSearchService normalizes and stems query-field text before it
        // reaches the analyzer. Stemming again here changes some scientific
        // terms a second time and makes the stored token differ from the query.
        return new TokenStreamComponents(tokenizer, tokenStream);
    }
}
