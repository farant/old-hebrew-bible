# Mark Chapter 4 — Translation Notes

## Versification

### 4:40-41 — Vulgate merges v.41 into v.40
- **Issue**: The Vulgate text for 4:40 contains material that belongs to 4:41 in the Greek and Hebrew. The Latin reads "et timuerunt timore magno, et dicebant ad alterutrum: Quis, putas, est iste..." which corresponds to the Greek/Hebrew 4:41. The JSON has 4:41 Latin as empty.
- **Vulgate 4:40**: *Et ait illis: Quid timidi estis? necdum habetis fidem? et timuerunt timore magno, et dicebant ad alterutrum: Quis, putas, est iste, quia et ventus et mare obediunt ei?*
- **Greek 4:40**: Only "Why are you afraid? Do you not yet have faith?"
- **Greek 4:41**: "And they feared a great fear, and said to one another: Who then is this..."
- **Note**: This is a data artifact. The Vulgate does have both verses; the content has been concatenated into verse 40 in our JSON. The Hebrew correctly splits 4:40 and 4:41 as separate verses matching the Greek. No textual problem, only a data-formatting issue to correct.

## Content Alignment

### 4:12 — "peccata" (sins) in Vulgate
- **Issue**: The Vulgate ends with "et dimittantur eis peccata" (and their sins be forgiven them). The Greek has only "aphethe autois" (it be forgiven them) without "sins" explicit. The Hebrew adds "sins" with וְנִסְלַח לְחַטֹּאתָם.
- **Vulgate**: *nequando convertantur, et dimittantur eis peccata*
- **Greek**: *mepote epistrepsosin kai aphethe autois* (no "sins" noun)
- **Hebrew**: וְנִסְלַח לְחַטֹּאתָם (and their sins be forgiven)
- **Note**: The Hebrew follows the Vulgate tradition by making "sins" explicit. This aligns correctly with our authoritative text.

### 4:24 — Bracketed addition [הַשֹּׁמְעִים]
- **Issue**: The Hebrew contains a bracketed word [הַשֹּׁמְעִים] ("those who hear") at the end. This does not appear in the Vulgate ("et adjicietur vobis") or the Greek ("kai prostethesetai hymin").
- **Vulgate**: *et adjicietur vobis* (and it will be added to you)
- **Hebrew**: וְעוֹד יוּסַף לָכֶם [הַשֹּׁמְעִים]
- **Note**: The bracketed word appears to be a gloss from the TR/Byzantine textual tradition. The Vulgate does not include it. It should be removed.

## Hebrew Translation Quality

### 4:3 — שִׁמְעוּ שָׁמוֹעַ (Hear, hearing)
- **Hebrew**: שִׁמְעוּ שָׁמוֹעַ
- **Note**: The cognate accusative construction (imperative + infinitive absolute) is excellent biblical Hebrew style. This accurately renders the Greek "Akouete" and Vulgate "Audite" while adding the Hebraic intensifying construction. The parable of the sower opens with an echo of the Shema pattern.

### 4:12 — Isaiah 6:9-10 allusion
- **Hebrew**: לְמַעַן יִרְאוּ רָאוֹ וְלֹא יֵדְעוּ וְשָׁמְעוּ שָׁמוֹעַ וְלֹא יָבִינוּ
- **Note**: Delitzsch renders this with strong infinitive absolute constructions (רָאוֹ, שָׁמוֹעַ) directly echoing the Masoretic text of Isaiah 6:9-10. Excellent. The phrasing closely tracks שִׁמְעוּ שָׁמוֹעַ וְאַל-תָּבִינוּ וּרְאוּ רָאוֹ וְאַל-תֵּדָעוּ from Isaiah, transposing it naturally into narrative context.

### 4:29 — מַגָּל (sickle)
- **Hebrew**: יְמַהֵר לִשְׁלֹחַ מַגָּל כִּי בָשַׁל קָצִיר
- **Note**: Strong. The phrase echoes Joel 4:13 [3:13 in English]: שִׁלְחוּ מַגָּל כִּי בָשַׁל קָצִיר ("Put in the sickle, for the harvest is ripe"). Delitzsch preserves the prophetic allusion precisely.

### 4:39 — הַס וָדֹם (Be silent and still)
- **Hebrew**: וַיֹּאמֶר אֶל-הַיָּם הַס וָדֹם
- **Note**: Powerful biblical Hebrew. הַס is an interjection found in Habakkuk 2:20, Zephaniah 1:7, and Zechariah 2:17 as a divine command for silence. דֹּם echoes Psalm 37:7. Together they render the Greek "Siopa, pephimoso" (Be silent, be muzzled) with strong OT resonance, appropriate for a theophanic command over creation.

## Other Notes

### 4:12 — Isaiah 6:9-10 (LXX connection)
This verse is Jesus quoting Isaiah 6:9-10 as the purpose of parabolic teaching. The LXX of Isaiah 6:9-10 uses similar phrasing (akoe akousete / blepsontes blepsete). Mark's version follows the Hebrew Vorlage more closely than the LXX. Delitzsch's Hebrew skillfully re-creates the Masoretic original, meaning this passage functions almost as a direct OT quotation in the Hebrew NT.

### 4:35-41 — Stilling the storm (Psalm 107 / Jonah)
The storm narrative echoes Psalm 107:23-30 (sailors in a storm, crying to the LORD, divine calming of the sea) and Jonah 1 (sleeping in the ship during a storm). Delitzsch's vocabulary choices reinforce these connections: רוּחַ-סְעָרָה (Psalm 107:25), דְמָמָה (1 Kings 19:12 — the "still small voice" at Horeb). The question "Who is this?" implicitly answers: the One whom wind and sea obey is YHWH (Psalm 89:10, 65:8).
