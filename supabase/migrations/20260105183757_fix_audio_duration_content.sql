-- Fix audio duration from 60 to 30 seconds in landing_content
UPDATE landing_content
SET value_pt = 'Grave um áudio de até 30 segundos. Nossa IA transcreve, roteiriza e gera slides prontos para Instagram, LinkedIn, TikTok e mais.'
WHERE section_key = 'hero' AND content_key = 'subtitle';

UPDATE landing_content
SET value_en = 'Record audio up to 30 seconds. Our AI transcribes, scripts, and generates ready-to-post slides for Instagram, LinkedIn, TikTok and more.'
WHERE section_key = 'hero' AND content_key = 'subtitle';

UPDATE landing_content
SET value_es = 'Graba un audio de hasta 30 segundos. Nuestra IA transcribe, guioniza y genera slides listos para Instagram, LinkedIn, TikTok y más.'
WHERE section_key = 'hero' AND content_key = 'subtitle';

-- Fix step1_desc in how_it_works
UPDATE landing_content
SET value_pt = 'Grave um áudio de até 30 segundos ou faça upload. Fale naturalmente sobre o que quiser compartilhar.'
WHERE section_key = 'how_it_works' AND content_key = 'step1_desc';

UPDATE landing_content
SET value_en = 'Record audio up to 30 seconds or upload. Speak naturally about what you want to share.'
WHERE section_key = 'how_it_works' AND content_key = 'step1_desc';

UPDATE landing_content
SET value_es = 'Graba un audio de hasta 30 segundos o sube. Habla naturalmente sobre lo que quieras compartir.'
WHERE section_key = 'how_it_works' AND content_key = 'step1_desc';

-- Fix FAQ about audio limit
UPDATE faqs
SET
  answer_pt = 'O limite é de 30 segundos por áudio. Recomendamos áudios claros e objetivos para melhores resultados.',
  answer_en = 'The limit is 30 seconds per audio. We recommend clear and concise audio for best results.',
  answer_es = 'El límite es de 30 segundos por audio. Recomendamos audios claros y concisos para mejores resultados.'
WHERE question_pt = 'Qual o limite de áudio?';
