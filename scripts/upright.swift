import Foundation
import Vision
import ImageIO
let req=VNDetectFaceRectanglesRequest()
do {
 try VNImageRequestHandler(url:URL(fileURLWithPath:CommandLine.arguments[1]),options:[:]).perform([req])
 let faces=(req.results ?? []).filter{$0.confidence>0.65}.sorted{$0.boundingBox.width*$0.boundingBox.height > $1.boundingBox.width*$1.boundingBox.height}
 if let face=faces.first,let roll=face.roll?.doubleValue {
  if abs(roll)>2.35 {print(180)}else if roll < -0.78 {print(90)}else if roll > 0.78 {print(-90)}else{print(0)}
 }else{print(0)}
}catch{print(0)}
