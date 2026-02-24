# John Chapter 1 — Translation Notes

## Versification
The Hebrew (Delitzsch) text contains 52 verses while the Vulgate and Greek (SBLGNT) both have 51. The Hebrew splits what is Greek/Latin verse 38 across two verses, creating a +1 offset from verse 38 onward. Specifically:
- Greek/Latin 1:38 contains both Jesus' question ("Quid quaeritis?") and the disciples' response ("Rabbi... ubi habitas?"). The Hebrew splits these into v38 (Jesus turns and sees them) and v39 (the question and response).
- This cascades so that Hebrew v52 has no Greek or Latin equivalent (both fields are empty). Hebrew v52 contains the "Amen, amen" saying about angels ascending and descending, which belongs to Vulgate/Greek 1:51.

This is a data alignment issue in the JSON: the Hebrew numbering follows the Delitzsch 1877 edition's own versification, which diverges from the Vulgate starting at 1:38.

## Content Alignment

### 1:1 — Vulgate brackets
- **Issue**: The Latin text begins with a bracket "[In principio..." indicating a liturgical reading boundary in the Clementine Vulgate. Not a content divergence; just a formatting artifact to preserve.
- **Vulgate**: [In principio erat Verbum...
- **Note**: Bracket pairs also appear at 1:18 (closing "]") and sporadically through the Hebrew text.

### 1:18 — "Unigenitus Filius" vs "monogenes theos"
- **Issue**: The SBLGNT reads "monogenes theos" (only-begotten God), following P66, P75, Sinaiticus, Vaticanus. The Vulgate reads "unigenitus Filius" (only-begotten Son), following later Byzantine manuscripts. The Hebrew follows the Vulgate reading with "ha-ben ha-yachid" (the only son).
- **Vulgate**: unigenitus Filius, qui est in sinu Patris, ipse enarravit.
- **Greek**: monogenes theos ho on eis ton kolpon tou patros ekeinos exegesato.
- **Hebrew**: ha-ben ha-yachid asher be-cheiq ha-av hu hodia.
- **Note**: The Hebrew correctly follows the Vulgate "Filius" tradition rather than the critical Greek "theos." This is a significant Christological variant. The Vulgate reading is authoritative for our purposes.

### 1:34 — "Filius Dei" vs "electus tou theou"
- **Issue**: The SBLGNT critical apparatus notes "eklektos" (chosen one) as a variant for "huios" (Son). The Vulgate reads "Filius Dei" (Son of God). The Hebrew reads "ben-ha-Elohim" (Son of God), correctly following the Vulgate.
- **Vulgate**: hic est Filius Dei.
- **Greek**: houtos estin ho eklektos tou theou (SBLGNT apparatus variant).
- **Hebrew**: ki zeh hu ben-ha-Elohim.
- **Note**: The Hebrew correctly aligns with the Vulgate. The "eklektos" reading, attested in P5, Sinaiticus (original hand), and some Old Latin, is interesting but we follow the Vulgate.

### 1:42 — "Filius Jona" vs "huios Ioannou"
- **Issue**: The Vulgate reads "filius Jona" (son of Jonah) while the SBLGNT reads "huios Ioannou" (son of John). The Hebrew reads "ben-Yochanan" (son of John), following the Greek rather than the Vulgate.
- **Vulgate**: Tu es Simon, filius Jona.
- **Greek**: Su ei Simon ho huios Ioannou.
- **Hebrew**: Shimon ben-Yochanan.
- **Note**: The Hebrew should follow the Vulgate reading "son of Jonah" (ben-Yonah) rather than "son of John." This applies also to 21:15-17 where the same name appears.

### 1:27 — "qui ante me factus est"
- **Issue**: The Vulgate includes "qui ante me factus est" (who was made before me), which is absent from the SBLGNT Greek text. The Hebrew includes "asher hayah le-fanai" (who was before me), aligning with the Vulgate's longer reading.
- **Vulgate**: Ipse est qui post me venturus est, qui ante me factus est : cujus ego non sum dignus ut solvam ejus corrigiam calceamenti.
- **Greek**: ho opiso mou erchomenos, hou ouk eimi axios hina lyso autou ton himanta tou hypodematous.
- **Note**: The Hebrew correctly includes the Vulgate's fuller reading here.

## Hebrew Translation Quality

### 1:1 — "be-reshit hayah ha-davar"
- **Hebrew**: be-reshit hayah ha-davar
- **Note**: Excellent. This opening directly echoes Genesis 1:1 ("be-reshit bara Elohim") and uses "davar" for Logos, which is the standard biblical Hebrew equivalent. The use of "hayah" (was) rather than a more dynamic verb is appropriate for the eternal pre-existence expressed here. The phrase "et ha-Elohim" to render "pros ton theon" (apud Deum) uses the accusative particle, which is idiomatic biblical Hebrew for expressing association.

### 1:3 — "al-yado" for "di autou"
- **Hebrew**: al-yado nihyah...u-mi-bal'adav
- **Note**: "al-yado" (by his hand/through him) is a natural biblical Hebrew expression for agency (cf. Exodus 35:29, Numbers 15:23). "mi-bal'adav" (without him) is also good biblical Hebrew (cf. Genesis 41:44). The use of Niphal "nihyah" (was made) for "egeneto" is appropriate.

### 1:14 — "rav-chesed ve-emet"
- **Hebrew**: rav-chesed ve-emet
- **Note**: Outstanding translation of "plenum gratiae et veritatis." The phrase "chesed ve-emet" directly evokes the covenantal formula of Exodus 34:6 ("rav chesed ve-emet"), creating a powerful theological link between the Incarnation and the Sinai theophany. This is arguably the best possible Hebrew rendering.

### 1:29 — "seh ha-Elohim" for "agnus Dei"
- **Hebrew**: hinneh seh ha-Elohim ha-noseh chatat ha-olam
- **Note**: Delitzsch uses "seh" (young animal, sheep/lamb) rather than "keves" (lamb specifically). "Seh" is actually the broader term used in the Passover legislation (Exodus 12:3, 5) and is therefore an excellent choice connecting to the Paschal typology. "Noseh chatat" (bearing the sin) echoes Isaiah 53:4, 12 (noseh chet rabbim).

### 1:11 — "be-shello" for "in propria"
- **Hebrew**: hu va be-shello va-asher hemmah lo lo qibbeluhu
- **Note**: "be-shello" (into his own) is somewhat Mishnaic in flavor. Biblical Hebrew would more naturally use "el nachalato" (to his inheritance) or "el amo" (to his people). However, the construction works and is comprehensible.

## Other Notes

### 1:23 — Isaiah 40:3 quotation
The Hebrew renders the Isaiah quotation with vocabulary very close to the MT of Isaiah 40:3: "qol qore ba-midbar pannu derekh YHVH." The Vulgate has "Dirigite viam Domini" while the Hebrew has "pannu derekh YHVH" (clear the way of the LORD), matching the MT precisely. This is an excellent LXX/MT alignment point.

### 1:51 — Jacob's Ladder allusion
The reference to angels ascending and descending (Genesis 28:12) is a significant OT allusion. The Hebrew "mal'akhei Elohim olim ve-yordim" closely echoes the Genesis phrasing, reinforcing the typological connection between Jacob/Israel and the Son of Man.
