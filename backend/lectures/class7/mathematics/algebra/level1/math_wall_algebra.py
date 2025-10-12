"""
🎯 MATH WALL FOR ALGEBRA - Revolutionary TTS Preprocessing System
================================================================

This is the world's first AI preprocessing system that converts mathematical 
expressions into human-like speech patterns for TTS systems.

Features:
- Converts digits to words: 2 → "two"
- Converts symbols to words: + → "plus", × → "times"
- Handles equations: 2x + 3 = 7 → "two x plus three equals seven"
- Handles fractions: 1/2 → "one half"
- Handles exponents: x² → "x squared"
- Handles roots: √16 → "square root of sixteen"
- Context-aware processing for algebra
"""

import re
from typing import Dict, List, Tuple, Optional

class MathWallAlgebra:
    """
    🧱 The Math Wall - Revolutionary preprocessing for algebraic TTS
    """
    
    def __init__(self):
        # 🔢 Basic digit mapping
        self.digits = {
            '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
            '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
        }
        
        # 🔢 Teen numbers
        self.teens = {
            '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
            '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
            '18': 'eighteen', '19': 'nineteen'
        }
        
        # 🔢 Tens
        self.tens = {
            '20': 'twenty', '30': 'thirty', '40': 'forty', '50': 'fifty',
            '60': 'sixty', '70': 'seventy', '80': 'eighty', '90': 'ninety'
        }
        
        # ➕➖ Mathematical operators (EXPANDED)
        self.operators = {
            # Basic arithmetic
            '+': ' plus ',
            '-': ' minus ',
            '×': ' times ',
            '*': ' times ',
            '·': ' times ',  # Middle dot multiplication
            '÷': ' divided by ',
            '/': ' divided by ',
            
            # Equality and comparison
            '=': ' equals ',
            '==': ' equals ',
            '≡': ' is equivalent to ',
            '≈': ' is approximately equal to ',
            '≅': ' is approximately equal to ',
            '~': ' is approximately ',
            
            # Inequalities
            '<': ' is less than ',
            '>': ' is greater than ',
            '≤': ' is less than or equal to ',
            '≥': ' is greater than or equal to ',
            '≪': ' is much less than ',
            '≫': ' is much greater than ',
            '≠': ' is not equal to ',
            '≢': ' is not equivalent to ',
            
            # Set operations
            '∈': ' is an element of ',
            '∉': ' is not an element of ',
            '⊂': ' is a subset of ',
            '⊃': ' is a superset of ',
            '⊆': ' is a subset of or equal to ',
            '⊇': ' is a superset of or equal to ',
            '∪': ' union ',
            '∩': ' intersection ',
            '∅': ' empty set ',
            
            # Logic
            '∧': ' and ',
            '∨': ' or ',
            '¬': ' not ',
            '⇒': ' implies ',
            '⇔': ' if and only if ',
            '∴': ' therefore ',
            '∵': ' because ',
            
            # Other operations
            '±': ' plus or minus ',
            '∓': ' minus or plus ',
            '%': ' percent ',
            '‰': ' per thousand ',
            '°': ' degrees ',
        }
        
        # 🔤 Algebraic symbols
        self.algebraic_symbols = {
            'x': 'x', 'y': 'y', 'z': 'z', 'a': 'a', 'b': 'b', 'c': 'c',
            'n': 'n', 'm': 'm', 'p': 'p', 'q': 'q', 'r': 'r', 's': 's', 't': 't'
        }
        
        # 📐 Mathematical functions and symbols (EXPANDED)
        self.functions = {
            # Roots
            '√': ' square root of ',
            '∛': ' cube root of ',
            '∜': ' fourth root of ',
            
            # Calculus
            '∑': ' sum of ',
            '∏': ' product of ',
            '∫': ' integral of ',
            '∬': ' double integral of ',
            '∭': ' triple integral of ',
            '∮': ' contour integral of ',
            '∂': ' partial derivative of ',
            '∇': ' gradient of ',
            'Δ': ' delta ',
            '∆': ' delta ',
            
            # Special constants
            'π': ' pi ',
            'e': ' e ',  # Euler's number (context-dependent)
            '∞': ' infinity ',
            'ℯ': ' e ',
            
            # Greek letters (lowercase)
            'α': ' alpha ',
            'β': ' beta ',
            'γ': ' gamma ',
            'δ': ' delta ',
            'ε': ' epsilon ',
            'ζ': ' zeta ',
            'η': ' eta ',
            'θ': ' theta ',
            'ι': ' iota ',
            'κ': ' kappa ',
            'λ': ' lambda ',
            'μ': ' mu ',
            'ν': ' nu ',
            'ξ': ' xi ',
            'ο': ' omicron ',
            'π': ' pi ',
            'ρ': ' rho ',
            'σ': ' sigma ',
            'τ': ' tau ',
            'υ': ' upsilon ',
            'φ': ' phi ',
            'χ': ' chi ',
            'ψ': ' psi ',
            'ω': ' omega ',
            
            # Greek letters (uppercase)
            'Α': ' Alpha ',
            'Β': ' Beta ',
            'Γ': ' Gamma ',
            'Δ': ' Delta ',
            'Ε': ' Epsilon ',
            'Ζ': ' Zeta ',
            'Η': ' Eta ',
            'Θ': ' Theta ',
            'Ι': ' Iota ',
            'Κ': ' Kappa ',
            'Λ': ' Lambda ',
            'Μ': ' Mu ',
            'Ν': ' Nu ',
            'Ξ': ' Xi ',
            'Ο': ' Omicron ',
            'Π': ' Pi ',
            'Ρ': ' Rho ',
            'Σ': ' Sigma ',
            'Τ': ' Tau ',
            'Υ': ' Upsilon ',
            'Φ': ' Phi ',
            'Χ': ' Chi ',
            'Ψ': ' Psi ',
            'Ω': ' Omega ',
            
            # Other symbols
            '|': ' absolute value of ',  # Context-dependent
            '‖': ' norm of ',
            '∝': ' is proportional to ',
            '∠': ' angle ',
            '⊥': ' is perpendicular to ',
            '∥': ' is parallel to ',
            '≅': ' is congruent to ',
            '∼': ' is similar to ',
            '⌊': ' floor of ',
            '⌋': ' ',
            '⌈': ' ceiling of ',
            '⌉': ' ',
            '!': ' factorial ',  # Context-dependent
        }
        
        # 📊 Exponents and powers (EXPANDED)
        self.exponents = {
            '⁰': ' to the power of zero',
            '¹': ' to the first power',
            '²': ' squared',
            '³': ' cubed',
            '⁴': ' to the fourth power',
            '⁵': ' to the fifth power',
            '⁶': ' to the sixth power',
            '⁷': ' to the seventh power',
            '⁸': ' to the eighth power',
            '⁹': ' to the ninth power',
            '⁺': ' to the positive power',
            '⁻': ' to the negative power',
            'ⁿ': ' to the n-th power',
        }
        
        # 📉 Subscripts
        self.subscripts = {
            '₀': ' sub zero',
            '₁': ' sub one',
            '₂': ' sub two',
            '₃': ' sub three',
            '₄': ' sub four',
            '₅': ' sub five',
            '₆': ' sub six',
            '₇': ' sub seven',
            '₈': ' sub eight',
            '₉': ' sub nine',
            'ₙ': ' sub n',
            'ₓ': ' sub x',
        }
        
        # 🔄 Common algebraic patterns
        self.patterns = {
            # Fractions
            r'(\d+)/(\d+)': self._convert_fraction,
            # Exponents with numbers
            r'(\w+)\^(\d+)': self._convert_exponent,
            # Square roots
            r'√(\w+)': self._convert_square_root,
            # Variables with coefficients
            r'(\d+)([a-zA-Z])': self._convert_coefficient_variable,
            # Parentheses
            r'\(([^)]+)\)': self._convert_parentheses
        }
    
    def process_text(self, text: str) -> str:
        """
        🎯 Main processing function - converts mathematical text to TTS-friendly format
        
        Args:
            text (str): Raw mathematical text
            
        Returns:
            str: TTS-friendly text
        """
        if not text or not isinstance(text, str):
            return text
        
        # Step 1: Clean and normalize input
        processed_text = self._clean_input(text)
        
        # Step 2: Handle special patterns first
        processed_text = self._process_patterns(processed_text)
        
        # Step 3: Convert operators
        processed_text = self._convert_operators(processed_text)
        
        # Step 4: Convert functions and symbols
        processed_text = self._convert_functions(processed_text)
        
        # Step 5: Convert exponents
        processed_text = self._convert_exponents(processed_text)
        
        # Step 6: Convert subscripts
        processed_text = self._convert_subscripts(processed_text)
        
        # Step 7: Convert numbers
        processed_text = self._convert_numbers(processed_text)
        
        # Step 8: Final cleanup
        processed_text = self._final_cleanup(processed_text)
        
        return processed_text
    
    def _clean_input(self, text: str) -> str:
        """Clean and normalize input text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Handle special characters
        text = text.replace('@', ' at the rate of ')
        return text
    
    def _process_patterns(self, text: str) -> str:
        """Process special mathematical patterns"""
        for pattern, converter in self.patterns.items():
            text = re.sub(pattern, converter, text)
        return text
    
    def _convert_fraction(self, match) -> str:
        """Convert fraction like 1/2 to 'one half'"""
        numerator = match.group(1)
        denominator = match.group(2)
        
        numerator_word = self._number_to_words(int(numerator))
        denominator_word = self._number_to_words(int(denominator))
        
        # Special cases for common fractions
        if numerator == '1':
            if denominator == '2':
                return ' one half '
            elif denominator == '3':
                return ' one third '
            elif denominator == '4':
                return ' one fourth '
            elif denominator == '5':
                return ' one fifth '
        
        return f' {numerator_word} over {denominator_word} '
    
    def _convert_exponent(self, match) -> str:
        """Convert exponent like x^2 to 'x squared'"""
        base = match.group(1)
        exponent = int(match.group(2))
        
        if exponent == 2:
            return f'{base} squared'
        elif exponent == 3:
            return f'{base} cubed'
        else:
            exponent_word = self._number_to_words(exponent)
            return f'{base} to the power of {exponent_word}'
    
    def _convert_square_root(self, match) -> str:
        """Convert √x to 'square root of x'"""
        content = match.group(1)
        return f' square root of {content} '
    
    def _convert_coefficient_variable(self, match) -> str:
        """Convert 2x to 'two x'"""
        coefficient = match.group(1)
        variable = match.group(2)
        coefficient_word = self._number_to_words(int(coefficient))
        return f'{coefficient_word} {variable}'
    
    def _convert_parentheses(self, match) -> str:
        """Convert (x + 2) to 'open parenthesis x plus two close parenthesis'"""
        content = match.group(1)
        processed_content = self.process_text(content)  # Recursive processing
        return f' open parenthesis {processed_content.strip()} close parenthesis '
    
    def _convert_operators(self, text: str) -> str:
        """Convert mathematical operators - SMART HYPHEN/MINUS DETECTION"""
        for operator, word in self.operators.items():
            # 🔧 UNIVERSAL FIX: Special handling for minus/hyphen (-)
            if operator == '-':
                # Only convert '-' to 'minus' when it's ACTUALLY a math operation
                # This preserves word hyphens AND title hyphens like "Algebra - Notation"
                
                # Pattern 1: digit - digit (e.g., "5 - 3", "5-3")
                text = re.sub(r'(\d)\s*-\s*(\d)', r'\1 minus \2', text)
                
                # Pattern 2: single-letter variable - single-letter variable (e.g., "x - y")
                # Use word boundaries to ensure it's a standalone variable, not part of a word
                text = re.sub(r'\b([a-zA-Z])\s+-\s+([a-zA-Z])\b', r'\1 minus \2', text)
                
                # Pattern 3: digit - single-letter variable (e.g., "5 - x")
                text = re.sub(r'(\d)\s+-\s+([a-zA-Z])\b', r'\1 minus \2', text)
                
                # Pattern 4: single-letter variable - digit (e.g., "x - 5")
                text = re.sub(r'\b([a-zA-Z])\s+-\s+(\d)', r'\1 minus \2', text)
                
                # Pattern 5: negative numbers (e.g., " -5", "(-3)")
                text = re.sub(r'([\s\(])-(\d)', r'\1minus \2', text)
            else:
                # For all other operators, do normal replacement
                text = text.replace(operator, word)
        return text
    
    def _convert_functions(self, text: str) -> str:
        """Convert mathematical functions and symbols"""
        for symbol, word in self.functions.items():
            # Special handling for factorial (!) - only convert when it follows a number
            if symbol == '!':
                # Only replace ! with "factorial" when it follows a digit
                text = re.sub(r'(\d+)!', r'\1 factorial', text)
            # Special handling for Euler's number (e) - only convert when standalone
            elif symbol == 'e':
                # Only replace 'e' with ' e ' when it's standalone (not part of a word)
                # Pattern: standalone 'e' surrounded by spaces, punctuation, or start/end
                text = re.sub(r'(?<![a-zA-Z])e(?![a-zA-Z])', ' e ', text)
            else:
                text = text.replace(symbol, word)
        return text
    
    def _convert_exponents(self, text: str) -> str:
        """Convert exponent symbols"""
        for symbol, word in self.exponents.items():
            text = text.replace(symbol, word)
        return text
    
    def _convert_subscripts(self, text: str) -> str:
        """Convert subscript symbols"""
        for symbol, word in self.subscripts.items():
            text = text.replace(symbol, word)
        return text
    
    def _convert_numbers(self, text: str) -> str:
        """Convert numbers to words, including decimals"""
        # 🔧 FIX: Handle decimal numbers first (e.g., 3.14 → "three point one four")
        decimal_pattern = r'\b(\d+)\.(\d+)\b'
        
        def replace_decimal(match):
            whole_part = match.group(1)
            decimal_part = match.group(2)
            
            # Convert whole part to words
            whole_words = self._number_to_words(int(whole_part))
            
            # Convert each decimal digit individually
            decimal_words = ' '.join([self.digits[d] for d in decimal_part])
            
            return f"{whole_words} point {decimal_words}"
        
        # First, replace decimals
        text = re.sub(decimal_pattern, replace_decimal, text)
        
        # Then, find all remaining whole numbers in the text
        number_pattern = r'\b\d+\b'
        
        def replace_number(match):
            number = int(match.group())
            return self._number_to_words(number)
        
        return re.sub(number_pattern, replace_number, text)
    
    def _number_to_words(self, number: int) -> str:
        """Convert a number to words"""
        if number < 0:
            return f"negative {self._number_to_words(-number)}"
        
        if number == 0:
            return "zero"
        
        if number < 10:
            return self.digits[str(number)]
        
        if number < 20:
            return self.teens[str(number)]
        
        if number < 100:
            tens_digit = (number // 10) * 10
            ones_digit = number % 10
            
            if ones_digit == 0:
                return self.tens[str(tens_digit)]
            else:
                return f"{self.tens[str(tens_digit)]} {self.digits[str(ones_digit)]}"
        
        if number < 1000:
            hundreds = number // 100
            remainder = number % 100
            
            result = f"{self.digits[str(hundreds)]} hundred"
            if remainder > 0:
                result += f" {self._number_to_words(remainder)}"
            
            return result
        
        # For larger numbers, use a simpler approach
        return str(number)
    
    def _final_cleanup(self, text: str) -> str:
        """Final cleanup of the processed text"""
        # Remove extra spaces
        text = re.sub(r'\s+', ' ', text)
        # Remove spaces around punctuation
        text = re.sub(r'\s+([.,!?;:])', r'\1', text)
        # Remove leading/trailing spaces
        text = text.strip()
        
        return text
    
    def process_equation(self, equation: str) -> str:
        """
        🎯 Specialized function for processing algebraic equations
        
        Examples:
        - "2x + 3 = 7" → "two x plus three equals seven"
        - "x² - 4 = 0" → "x squared minus four equals zero"
        - "√(x + 1) = 3" → "square root of open parenthesis x plus one close parenthesis equals three"
        """
        return self.process_text(equation)
    
    def process_expression(self, expression: str) -> str:
        """
        🎯 Specialized function for processing algebraic expressions
        
        Examples:
        - "3x + 2y" → "three x plus two y"
        - "x² + 2x + 1" → "x squared plus two x plus one"
        """
        return self.process_text(expression)
    
    def get_processing_stats(self) -> Dict[str, int]:
        """Get statistics about the math wall processing capabilities"""
        return {
            "digits": len(self.digits),
            "operators": len(self.operators),
            "functions": len(self.functions),
            "exponents": len(self.exponents),
            "subscripts": len(self.subscripts),
            "patterns": len(self.patterns),
            "total_symbols": len(self.digits) + len(self.operators) + len(self.functions) + len(self.exponents) + len(self.subscripts)
        }


# 🧪 Test Functions
def test_math_wall():
    """Test the Math Wall with various algebraic expressions"""
    wall = MathWallAlgebra()
    
    test_cases = [
        # Basic arithmetic
        "2 + 3 = 5",
        "10 - 4 = 6",
        "3 × 2 = 6",
        "8 ÷ 2 = 4",
        
        # Algebraic expressions
        "2x + 3",
        "x² - 4",
        "3x + 2y = 10",
        "x² + 2x + 1",
        
        # Fractions and decimals
        "1/2 + 1/4 = 3/4",
        "3.14 + 2.86 = 6.00",
        
        # Advanced expressions
        "√(x + 1) = 3",
        "x² + y² = 25",
        "2x³ - 3x² + x - 1",
        
        # Greek letters and symbols
        "π × r²",
        "α + β = γ",
        "∑(x + 1)",
        
        # Complex equations
        "2(x + 3) = 10",
        "x² - 5x + 6 = 0"
    ]
    
    print("🧪 TESTING MATH WALL FOR ALGEBRA")
    print("=" * 50)
    
    for i, test_case in enumerate(test_cases, 1):
        result = wall.process_text(test_case)
        print(f"{i:2d}. Input:  {test_case}")
        print(f"    Output: {result}")
        print()
    
    # Show statistics
    stats = wall.get_processing_stats()
    print("📊 MATH WALL STATISTICS:")
    print(f"   Total symbols processed: {stats['total_symbols']}")
    print(f"   Digits: {stats['digits']}")
    print(f"   Operators: {stats['operators']}")
    print(f"   Functions: {stats['functions']}")
    print(f"   Exponents: {stats['exponents']}")
    print(f"   Patterns: {stats['patterns']}")


if __name__ == "__main__":
    test_math_wall()
