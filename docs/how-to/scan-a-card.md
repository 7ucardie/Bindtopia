# Scan a card

1. Choose the correct **card language** before scanning.
2. Open the scanner, then take or select one card photo. On a phone, **Take photo** opens the camera app. On a computer it opens a live webcam view in the browser (Chrome, Edge, Firefox, Safari) after you allow camera access; the camera stops as soon as you take the photo or cancel. **Choose photo** always picks an existing image.
3. Photograph straight from above with sharp text and minimal glare. Include the name and the number near the bottom.
4. Wait for recognition files to load. The first scan can be slower.
5. Correct the recognized text if needed and choose **Find matches**.
6. Check the actual image, set, number and language before saving a match.

The web version uses Tesseract.js locally. Each photo is first turned into crisp black-and-white text (every pixel compared with its own surroundings, so uneven light and coloured card backgrounds matter less) and enlarged, so small print such as the collector number `009/094` can be read; if that gives no certain match a second, plain greyscale pass follows. The card does not have to fill the photo, but the number in the bottom corner must be sharp. A real phone photo is part of the automated tests; the native app uses Apple Vision. A failed scan can be searched manually. Try JPG/PNG if the browser cannot decode a photo format. Do not include faces or personal documents. Clear the scan when finished; this does not delete the original photo file.
