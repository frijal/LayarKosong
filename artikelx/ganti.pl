#!/usr/bin/env perl
use strict;
use warnings;
use File::Copy;

my $quiet = grep { $_ eq '--quiet' } @ARGV;

# Peta penggantian CDN → lokal
my %REPLACEMENTS = (
    # Font Awesome (Cloudflare, jsDelivr, NPM, lama)
    qr{https://cdnjs\.cloudflare\.com/ajax/libs/font-awesome/[^"']+/css/all\.min\.css}i
        => '/ext/fontawesome.css',
    qr{https://cdn\.jsdelivr\.net/npm/\@fortawesome/fontawesome-free\@[^/]+/css/all\.min\.css}i
        => '/ext/fontawesome.css',
    qr{https://use\.fontawesome\.com/releases/v[^/]+/css/all\.css}i
        => '/ext/fontawesome.css',

    # Highlight.js - JS
    qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/[^"']+/highlight\.min\.js}i
        => '/ext/highlight.js',
    qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release\@[^/]+/build/highlight\.min\.js}i
        => '/ext/highlight.js',
    qr{https://cdn\.jsdelivr\.net/npm/highlight\.js\@[^/]+/highlight\.min\.js}i
        => '/ext/highlight.js',

    # Highlight.js - CSS (default, github, github-dark)
    qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/[^"']+/styles/default\.min\.css}i
        => '/ext/github.min.css',
    qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/[^"']+/styles/github\.min\.css}i
        => '/ext/github.min.css',
    qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/[^"']+/styles/github-dark\.min\.css}i
        => '/ext/github-dark.min.css',
);

# Target file
my @files = @ARGV ? grep { -f $_ } @ARGV : glob("*.html");

foreach my $file (@files) {
    open my $fh, '<:utf8', $file or next;
    local $/;
    my $content = <$fh>;
    close $fh;

    my $original = $content;
    my $changed = 0;

    for my $pattern (keys %REPLACEMENTS) {
        my $replacement = $REPLACEMENTS{$pattern};
        if ($content =~ s{$pattern}{$replacement}gsi) {
            $changed++;
        }
    }

    if ($changed && $content ne $original) {
        copy($file, "$file.bak");
        open my $out, '>:utf8', $file or die "❌ Tidak bisa menulis $file: $!";
        print $out $content;
        close $out;
        print "✅ Diganti: $file (backup: $file.bak)\n" unless $quiet;
    }
    elsif (!$quiet) {
        print "ℹ️  Tidak ada perubahan: $file\n";
    }
}
